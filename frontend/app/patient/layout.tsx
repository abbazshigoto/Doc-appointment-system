"use client";

import { DashboardLayout } from "@/lib/dashboard-layout";
import { PATIENT_NAV_LINKS } from "@/lib/nav-links";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="patient" title="Patient Dashboard" links={PATIENT_NAV_LINKS}>
      {children}
    </DashboardLayout>
  );
}
