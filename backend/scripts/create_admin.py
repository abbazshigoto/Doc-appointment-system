"""One-off CLI to create an admin account.

Deliberately NOT an API endpoint: admin is a privileged role and must not be
reachable through public /auth/register (see RegisterRequest's role validator).
Run with: .venv/Scripts/python.exe -m scripts.create_admin --email ... --full-name "..."
"""
import argparse
import asyncio
import getpass
import sys

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.modules.auth.repository import AuthRepository
from app.modules.users.models import User, UserRole


async def create_admin(email: str, full_name: str, password: str) -> None:
    async with AsyncSessionLocal() as session:
        repo = AuthRepository(session)
        if await repo.get_by_email(email) is not None:
            raise SystemExit(f"A user with email {email!r} already exists")

        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.ADMIN,
        )
        user = await repo.create(user)
        print(f"Created admin user id={user.id} email={user.email}")


def read_password(prompt: str) -> str:
    # getpass reads straight from the console device on Windows (via msvcrt),
    # bypassing stdin redirection entirely, so piped/non-interactive input
    # would otherwise hang forever waiting on a real keyboard.
    if sys.stdin.isatty():
        return getpass.getpass(prompt)
    return input(prompt)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--full-name", required=True)
    args = parser.parse_args()

    password = read_password("Password: ")
    if password != read_password("Confirm password: "):
        raise SystemExit("Passwords did not match")

    asyncio.run(create_admin(args.email, args.full_name, password))


if __name__ == "__main__":
    main()
