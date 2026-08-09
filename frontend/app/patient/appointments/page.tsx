"use client";

import { useEffect, useState } from "react";
import { ApiError, cancelAppointment, listDoctors, listMyAppointments } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/lib/dashboard-header";
import { PATIENT_NAV_LINKS } from "@/lib/nav-links";
import { RequireRole } from "@/lib/require-role";
import type { AppointmentResponse, DoctorResponse } from "@/lib/types";

function AppointmentList() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentResponse[] | null>(null);
  const [doctorsById, setDoctorsById] = useState<Map<number, DoctorResponse>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([listMyAppointments(token), listDoctors(token)])
      .then(([appointmentsData, doctorsData]) => {
        setAppointments(appointmentsData);
        setDoctorsById(new Map(doctorsData.map((doctor) => [doctor.id, doctor])));
      })
      .catch(() => setError("Could not load your appointments"));
  }, [token]);

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
    }
  }

  if (error) return <div className="error-banner">{error}</div>;
  if (appointments === null) return <p>Loading your appointments...</p>;
  if (appointments.length === 0) return <p>You have no appointments yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "640px" }}>
      {appointments.map((appt) => {
        const doctor = doctorsById.get(appt.doctor_id);
        const isCancelled = appt.status === "cancelled";
        return (
          <div key={appt.id} className="card" style={{ maxWidth: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontWeight: 500 }}>{doctor ? doctor.user.full_name : `Doctor #${appt.doctor_id}`}</p>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                {new Date(appt.start_time).toLocaleString()}
              </p>
              <p
                style={{
                  fontSize: "0.8rem",
                  marginTop: "0.35rem",
                  color: isCancelled ? "var(--danger)" : "var(--accent)",
                  textTransform: "capitalize",
                }}
              >
                {appt.status}
              </p>
            </div>
            {!isCancelled && (
              <button
                className="button-link"
                disabled={cancellingId === appt.id}
                onClick={() => handleCancel(appt.id)}
              >
                {cancellingId === appt.id ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AppointmentsPage() {
  return (
    <RequireRole role="patient">
      <DashboardHeader title="Patient Dashboard" links={PATIENT_NAV_LINKS} />
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>My appointments</h1>
        <AppointmentList />
      </div>
    </RequireRole>
  );
}
