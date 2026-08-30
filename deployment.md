# Deployment Log — Doc Appointment System

Frontend on AWS Amplify Hosting, backend + Postgres + Redis on a single EC2 instance.
Region: `ap-south-1`. No purchased domain — backend TLS uses a free [sslip.io](https://sslip.io) hostname.

## Architecture

```
Browser
  │  HTTPS
  ▼
Amplify (main.d1mgt9oit9nemj.amplifyapp.com)   ← Next.js, auto-deploys on push to main
  │  HTTPS (fetch calls from the browser)
  ▼
nginx + certbot (EC2, ports 80/443)            ← TLS termination for 13-205-75-173.sslip.io
  │  HTTP, localhost only
  ▼
FastAPI backend (Docker, 127.0.0.1:8000)
  │
  ▼
Postgres (127.0.0.1:5433) + Redis (127.0.0.1:6379)  ← Docker containers, same host
```

## What we did, in order

1. **EC2 instance** — launched `doc-appt-server`, Ubuntu 24.04 LTS, `t3.micro`, 20 GiB gp3, key pair `doc-appt-key`. Security group `doc-appt-sg`: SSH (22) from My IP only, HTTP (80) and HTTPS (443) from anywhere. Nothing else opened — Postgres/Redis/backend ports never got a security group rule.

2. **Elastic IP + hostname** — allocated an Elastic IP (`13.205.75.173`) and associated it with the instance so the IP doesn't change on restart. Used sslip.io instead of buying a domain: `13-205-75-173.sslip.io` resolves straight to that IP, and certbot can issue it a real Let's Encrypt certificate exactly like a bought domain.

3. **Docker** — installed Docker Engine + Compose plugin on Ubuntu, added `ubuntu` to the `docker` group.

4. **App** — cloned the repo, created a production `.env` (real `POSTGRES_PASSWORD` / `JWT_SECRET_KEY` via `openssl rand`, `CORS_ORIGINS` set to the frontend origin), hardened `docker-compose.yml` port bindings to `127.0.0.1` for postgres/redis/backend (server-only change, not committed to git — nginx is the only public door), then `docker compose up -d --build`. Stopped/removed the `frontend` container since the frontend lives on Amplify, not here.

5. **nginx + TLS** — installed nginx, added a reverse-proxy site config (`server_name 13-205-75-173.sslip.io` → `proxy_pass http://127.0.0.1:8000`), then `sudo certbot --nginx -d 13-205-75-173.sslip.io` for a free auto-renewing cert.

6. **Amplify** — connected the GitHub repo (`abbazshigoto/Doc-appointment-system`, branch `main`), set monorepo root to `frontend`, added build-time env var `NEXT_PUBLIC_API_URL=https://13-205-75-173.sslip.io`, deployed. Amplify auto-rebuilds on every push to `main`.

7. **CORS** — set `CORS_ORIGINS` in the EC2 `.env` to the real Amplify URL (`https://main.d1mgt9oit9nemj.amplifyapp.com`), recreated the backend container.

8. **Seed data** — ran `docker compose exec backend python -m scripts.seed_dummy_data` inside the backend container to create an admin, sample doctors, patients, and appointments (all seeded accounts use password `password123`).

## Mistakes made along the way

- **Forgot to push code before deploying.** The CORS config change (making `allow_origins` read from an env var instead of being hardcoded to `localhost:3000`) was made locally but never pushed to GitHub before EC2 cloned the repo. Had to catch this mid-deployment, commit, push, then `git pull` + rebuild on EC2 to pick it up.

- **GitHub token scope silently not attaching.** Generated three classic personal access tokens in a row that all came back with **zero scopes** (`x-oauth-scopes:` empty) despite checking the `repo` box each time — confirmed via `curl -I -H "Authorization: token ..." https://api.github.com/repos/...` and checking the `x-oauth-scopes` response header. Root cause was never fully identified (tried incognito to rule out extensions, still failed), but a token generated carefully on a later attempt worked. **Lesson:** when a git auth error looks like a permissions problem, verify the token's actual scopes via the GitHub API directly instead of assuming the checkbox click worked.

- **Old token stuck in the git remote URL.** After cloning with `git clone https://user:TOKEN@github.com/...`, that token got baked permanently into `origin`'s URL (`git remote -v` revealed it). Later token rotations kept silently failing auth with no prompt at all, because git kept reusing the dead embedded credential instead of asking. Fixed with `git remote set-url origin https://github.com/...` (no credentials in the URL) plus `git config credential.helper store` going forward.

- **EC2 OOM crash mid-build.** `t3.micro` only has ~911 MB RAM and no swap by default. The first `docker compose up -d --build` (building the Next.js frontend image) crashed the instance — EC2's **Instance status check** failed for ~2 hours while System/EBS checks stayed green (classic signature of a hung/crashed guest OS, not a hardware issue). Fixed by rebooting the instance and adding a 2 GB swap file (`fallocate` + `mkswap` + `swapon`, persisted via `/etc/fstab`) before retrying.

- **Ran an unnecessary frontend container on EC2.** `docker-compose.yml` includes a `frontend` service for local dev, but the actual frontend lives on Amplify — running it on the already RAM-starved EC2 box too was pure waste and part of what strained memory during the build. Stopped and removed it (`docker compose stop frontend && docker compose rm -f frontend`).

- **`git pull` conflict from a server-only edit.** The `docker-compose.yml` port-binding hardening (loopback-only for postgres/redis/backend) was made directly on the EC2 box and never committed, so a later `git pull` (bringing in the CORS fix, which also touched `docker-compose.yml`) refused to overwrite it. Fixed with `git stash` → `git pull` → reapply the port-binding edit manually.

- **Amplify build failing on `npm ci` — lockfile drift.** `frontend/package-lock.json` was missing `@emnapi/runtime@1.11.3` / `@emnapi/core@1.11.3` (a transitive optional dependency, pulled in via ESLint's resolver, that differs by platform). `npm ci` requires an exact match between `package.json` and the lockfile and refused to proceed. Fixed by deleting `node_modules` + `package-lock.json` and running a fresh `npm install` to regenerate it, then committing the new lockfile.

- **Security group SSH lockout after a wifi outage.** Wifi dropped for about an hour during a build. Afterward, `ssh` timed out — turned out the home IP had changed on reconnect, and the security group's SSH rule was pinned to the old IP (`My IP` is a snapshot, not a live check). Diagnosed with `Test-NetConnection -Port 22` (confirmed `TcpTestSucceeded: False`, i.e. genuinely blocked, not a credentials issue) and fixed by re-picking "My IP" in the security group's inbound rule.

- **Secrets pasted in plaintext for debugging.** Multiple GitHub tokens ended up pasted directly into chat/terminal (to debug the scope issue, using the `https://user:TOKEN@github.com/...` URL form). Every token used this way was revoked afterward and regenerated — worth remembering that debugging auth issues by embedding credentials in a command is useful but means that credential should be treated as burned once used.

## Cost-control / pausing the deployment

- `docker compose down` on EC2, then **Instance state → Stop** in the EC2 console stops compute billing.
- **Gotcha:** an Elastic IP costs ~$0.005/hr when *not* attached to a *running* instance — stopping the instance (without releasing the EIP) quietly starts a small charge. Release the EIP for true $0, at the cost of getting a new IP (and needing a new sslip.io hostname + cert + Amplify env var update) on next start.
- Amplify Hosting needs no action to "pause" — it's not billed per-hour, only for build minutes/bandwidth, both free-tier-covered for this level of traffic.
- The 20 GiB EBS volume keeps costing (or staying within the free tier's 30 GB allowance) while the instance is stopped, since that's what preserves the data.