import type { NavLink } from "./dashboard-header";

export const PATIENT_NAV_LINKS: NavLink[] = [
  { href: "/patient", label: "Find Doctors" },
  { href: "/patient/appointments", label: "My Appointments" },
  { href: "/patient/notifications", label: "Notifications" },
];
