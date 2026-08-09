import type { NavLink } from "./sidebar";

export const PATIENT_NAV_LINKS: NavLink[] = [
  { href: "/patient", label: "Find Doctors" },
  { href: "/patient/appointments", label: "My Appointments" },
  { href: "/patient/notifications", label: "Notifications" },
];

export const DOCTOR_NAV_LINKS: NavLink[] = [
  { href: "/doctor", label: "Appointments" },
  { href: "/doctor/availability", label: "Availability" },
  { href: "/doctor/notifications", label: "Notifications" },
];

export const ADMIN_NAV_LINKS: NavLink[] = [{ href: "/admin", label: "Users" }];
