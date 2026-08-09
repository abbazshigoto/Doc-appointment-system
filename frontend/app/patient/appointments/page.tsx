"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, cancelAppointment, listDoctors, listMyAppointments } from "@/lib/api";
import { statusBadge } from "@/lib/appointment-status";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/lib/avatar";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import type { AppointmentResponse, DoctorResponse } from "@/lib/types";

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

function AppointmentCard({
  appt,
  doctor,
  onCancel,
  isCancelling,
}: {
  appt: AppointmentResponse;
  doctor: DoctorResponse | undefined;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const canCancel = appt.status === "confirmed" && new Date(appt.start_time) >= new Date();
  const badge = statusBadge(appt);
  const name = doctor ? doctor.user.full_name : `Doctor #${appt.doctor_id}`;

  return (
    <div
      className="card"
      style={{ maxWidth: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", minWidth: 0 }}>
        <Avatar name={name} size={44} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</p>
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
      {canCancel && (
        <button className="button-link-danger" disabled={isCancelling} onClick={onCancel} style={{ flexShrink: 0 }}>
          {isCancelling ? "Cancelling..." : "Cancel"}
        </button>
      )}
    </div>
  );
}

function AppointmentList() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponse[] | null>(null);
  const [doctorsById, setDoctorsById] = useState<Map<number, DoctorResponse>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [pendingCancel, setPendingCancel] = useState<AppointmentResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([listMyAppointments(token), listDoctors(token)])
      .then(([appointmentsData, doctorsData]) => {
        setAppointments(appointmentsData);
        setDoctorsById(new Map(doctorsData.map((doctor) => [doctor.id, doctor])));
      })
      .catch(() => setError("Could not load your appointments"));
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

  async function handleCancel(appointmentId: number) {
    if (!token) return;
    setCancellingId(appointmentId);
    setError(null);
    try {
      const updated = await cancelAppointment(token, appointmentId);
      setAppointments((prev) =>
        prev ? prev.map((appt) => (appt.id === updated.id ? updated : appt)) : prev
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this appointment");
    } finally {
      setCancellingId(null);
      setPendingCancel(null);
    }
  }

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
        <p style={{ marginBottom: "1rem" }}>You have no appointments yet.</p>
        <Link href="/patient" className="button" style={{ display: "inline-block" }}>
          Find a doctor
        </Link>
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
              <AppointmentCard
                key={appt.id}
                appt={appt}
                doctor={doctorsById.get(appt.doctor_id)}
                onCancel={() => setPendingCancel(appt)}
                isCancelling={cancellingId === appt.id}
              />
            ))}
          </div>
        )}
      </div>

      {other.length > 0 && (
        <div>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Past &amp; cancelled</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {other.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                doctor={doctorsById.get(appt.doctor_id)}
                onCancel={() => setPendingCancel(appt)}
                isCancelling={cancellingId === appt.id}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        title="Cancel this appointment?"
        message={
          pendingCancel
            ? `Your appointment with ${
                doctorsById.get(pendingCancel.doctor_id)?.user.full_name ?? `Doctor #${pendingCancel.doctor_id}`
              } on ${new Date(pendingCancel.start_time).toLocaleString()} will be cancelled.`
            : ""
        }
        confirmLabel="Cancel appointment"
        cancelLabel="Keep it"
        danger
        isConfirming={cancellingId !== null}
        onConfirm={() => pendingCancel && handleCancel(pendingCancel.id)}
        onCancel={() => setPendingCancel(null)}
      />
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>My appointments</h1>
      <AppointmentList />
    </div>
  );
}
