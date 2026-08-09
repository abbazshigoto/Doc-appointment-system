"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export interface NavLink {
  href: string;
  label: string;
}

export function DashboardHeader({ title, links }: { title: string; links: NavLink[] }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <strong>{title}</strong>
        <nav style={{ display: "flex", gap: "1rem" }}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: "0.9rem",
                color: pathname === link.href ? "var(--accent)" : "var(--muted)",
                fontWeight: pathname === link.href ? 600 : 400,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {user?.full_name} ({user?.role})
        </span>
        <button className="button-link" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
