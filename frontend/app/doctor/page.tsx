"use client";

import { DashboardHeader } from "@/lib/dashboard-header";
import { RequireRole } from "@/lib/require-role";

export default function DoctorDashboard() {
  return (
    <RequireRole role="doctor">
      <DashboardHeader title="Doctor Dashboard" links={[{ href: "/doctor", label: "Dashboard" }]} />
      <div className="page-center">
        <p>Manage your profile, availability, and appointments here soon.</p>
      </div>
    </RequireRole>
  );
}
