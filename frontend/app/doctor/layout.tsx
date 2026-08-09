"use client";

import { DashboardLayout } from "@/lib/dashboard-layout";
import { DOCTOR_NAV_LINKS } from "@/lib/nav-links";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="doctor" title="Doctor Dashboard" links={DOCTOR_NAV_LINKS} profileHref="/doctor/profile">
      {children}
    </DashboardLayout>
  );
}

