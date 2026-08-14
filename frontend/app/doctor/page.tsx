"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, listMyDoctorAppointments } from "@/lib/api";
import { statusBadge } from "@/lib/appointment-status";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/lib/avatar";
import { NoDoctorProfileNotice } from "@/lib/no-doctor-profile-notice";
import type { AppointmentResponse } from "@/lib/types";

function AppointmentCardSkeleton() {
  return (
    <div className="card" style={{ maxWidth: "none", display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <div className="skeleton" style={{ width: "44px", height: "44px", borderRadius: "50%" }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: "0.9rem", width: "50%", marginBottom: "0.4rem" }} />
        <div className="skeleton" style={{ height: "0.75rem", width: "35%" }} />
      </div>
    </div>
  );
}

function AppointmentCard({ appt }: { appt: AppointmentResponse }) {
  const badge = statusBadge(appt);
  return (
    <div className="card" style={{ maxWidth: "none", display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <Avatar name={appt.patient.full_name} size={44} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 600 }}>{appt.patient.full_name}</p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{appt.patient.email}</p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{new Date(appt.start_time).toLocaleString()}</p>
        <span
          style={{
            display: "inline-block",
            marginTop: "0.35rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            padding: "0.15rem 0.55rem",
            borderRadius: "999px",
            background: badge.bg,
            color: badge.color,
          }}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}

function AppointmentList() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (!token) return;
    listMyDoctorAppointments(token)
      .then(setAppointments)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsProfile(true);
        } else {
          setError("Could not load your appointments");
        }
      });
  }, [token]);

  const { upcoming, other } = useMemo(() => {
    const list = appointments ?? [];
    const now = new Date();
    const upcoming = list.filter((a) => a.status === "confirmed" && new Date(a.start_time) >= now);
    const other = list
      .filter((a) => !(a.status === "confirmed" && new Date(a.start_time) >= now))
      .slice()
      .reverse();
    return { upcoming, other };
  }, [appointments]);

  if (needsProfile) return <NoDoctorProfileNotice />;
  if (error) return <div className="error-banner">{error}</div>;

  if (appointments === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "640px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <AppointmentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="card" style={{ maxWidth: "480px" }}>
        <p style={{ color: "var(--muted)" }}>
          No appointments booked yet. Once your availability is set, patients can book time with you.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", maxWidth: "640px" }}>
      <div>
        <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Nothing scheduled.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        )}
      </div>

      {other.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Past &amp; cancelled</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {other.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Your appointments</h1>
      <AppointmentList />
    </div>
  );
}
