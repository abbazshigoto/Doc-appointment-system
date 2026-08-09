"use client";

import { DashboardLayout } from "@/lib/dashboard-layout";
import { ADMIN_NAV_LINKS } from "@/lib/nav-links";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="admin" title="Admin Dashboard" links={ADMIN_NAV_LINKS}>
      {children}
    </DashboardLayout>
  );
}
