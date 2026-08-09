"use client";

import { DashboardHeader } from "@/lib/dashboard-header";
import { RequireRole } from "@/lib/require-role";

export default function AdminDashboard() {
  return (
    <RequireRole role="admin">
      <DashboardHeader title="Admin Dashboard" links={[{ href: "/admin", label: "Dashboard" }]} />
      <div className="page-center">
        <p>User oversight tools here soon.</p>
      </div>
    </RequireRole>
  );
}