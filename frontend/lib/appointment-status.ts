import type { AppointmentResponse } from "./types";

export function statusBadge(appt: AppointmentResponse): { label: string; bg: string; color: string } {
  if (appt.status === "cancelled") {
    return { label: "Cancelled", bg: "var(--danger-bg)", color: "var(--danger)" };
  }
  if (new Date(appt.start_time) < new Date()) {
    return { label: "Past", bg: "var(--border)", color: "var(--muted)" };
  }
  return { label: "Confirmed", bg: "var(--accent)", color: "var(--accent-foreground)" };
}
