"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "./avatar";
import { useAuth } from "./auth-context";
import { ConfirmDialog } from "./confirm-dialog";

export interface NavLink {
  href: string;
  label: string;
}

export function Sidebar({
  title,
  links,
  profileHref,
}: {
  title: string;
  links: NavLink[];
  profileHref?: string;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: "220px",
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100vh",
        overflowY: "auto",
      }}
    >
      <div>
        <strong style={{ display: "block", marginBottom: "1.5rem", fontSize: "1rem" }}>{title}</strong>
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "nav-link nav-link-active" : "nav-link"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {profileHref ? (
          <Link href={profileHref} className="profile-link" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Avatar name={user?.full_name ?? ""} size={32} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600, color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.full_name}
              </span>
              <span style={{ display: "block", fontSize: "0.8rem", textTransform: "capitalize" }}>{user?.role}</span>
            </span>
          </Link>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Avatar name={user?.full_name ?? ""} size={32} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user?.full_name}
              </span>
              <span style={{ display: "block", fontSize: "0.8rem", color: "var(--muted)", textTransform: "capitalize" }}>
                {user?.role}
              </span>
            </span>
          </div>
        )}
        <button className="sidebar-logout" onClick={() => setConfirmingLogout(true)}>
          Log out
        </button>
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        title="Log out?"
        message="You'll need to sign in again to access your account."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        danger
        onConfirm={handleLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </aside>
  );
}
