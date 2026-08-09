"use client";

import { RequireRole } from "./require-role";
import { Sidebar, type NavLink } from "./sidebar";
import type { UserRole } from "./types";

export function DashboardLayout({
  role,
  title,
  links,
  profileHref,
  children,
}: {
  role: UserRole;
  title: string;
  links: NavLink[];
  profileHref?: string;
  children: React.ReactNode;
}) {
  return (
    <RequireRole role={role}>
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar title={title} links={links} profileHref={profileHref} />
        <main style={{ flex: 1, minWidth: 0, height: "100vh", overflowY: "auto" }}>{children}</main>
      </div>
    </RequireRole>
  );
}
