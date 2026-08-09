"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, bookAppointment, getDoctor, listDoctorAvailability } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/lib/dashboard-header";
import { PATIENT_NAV_LINKS } from "@/lib/nav-links";
import { RequireRole } from "@/lib/require-role";
import { generateSlots } from "@/lib/slots";
import type { AvailabilityWindowResponse, DoctorResponse } from "@/lib/types";

function BookingView() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ doctorId: string }>();
  const doctorId = Number(params.doctorId);

  const [doctor, setDoctor] = useState<DoctorResponse | null>(null);
  const [windows, setWindows] = useState<AvailabilityWindowResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    Promise.all([getDoctor(token, doctorId), listDoctorAvailability(token, doctorId)])
      .then(([doctorData, windowsData]) => {
        setDoctor(doctorData);
        setWindows(windowsData);
      })
      .catch(() => setError("Could not load this doctor"));
  }, [token, doctorId]);

  async function handleBook(slot: Date) {
    if (!token) return;
    const slotIso = slot.toISOString();
    setBookingSlot(slotIso);
    setError(null);
    try {
      await bookAppointment(token, { doctor_id: doctorId, start_time: slotIso });
      router.push("/patient/appointments");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setUnavailableSlots((prev) => new Set(prev).add(slotIso));
        setError("That slot was just taken. Please pick another.");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not book this slot");
      }
    } finally {
      setBookingSlot(null);
    }
  }

  if (error && !doctor) return <div className="error-banner">{error}</div>;
  if (doctor === null || windows === null) return <p>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "640px" }}>
      <div className="card" style={{ maxWidth: "none" }}>
        <h1>{doctor.user.full_name}</h1>
        <p className="subtitle">{doctor.specialty}</p>
        {doctor.bio && <p style={{ marginBottom: "0.75rem" }}>{doctor.bio}</p>}
        <p style={{ fontSize: "0.9rem" }}>{doctor.years_of_experience} years experience</p>
        <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>${doctor.consultation_fee} per visit</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Available times</h2>
        {windows.length === 0 && <p style={{ color: "var(--muted)" }}>No availability posted yet.</p>}
        {windows.map((window) => {
          const slots = generateSlots(window.start_time, window.end_time);
          return (
            <div key={window.id} style={{ marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                {new Date(window.start_time).toLocaleString()} – {new Date(window.end_time).toLocaleTimeString()}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {slots.map((slot) => {
                  const slotIso = slot.toISOString();
                  const isUnavailable = unavailableSlots.has(slotIso);
                  return (
                    <button
                      key={slotIso}
                      className="button"
                      disabled={isUnavailable || bookingSlot === slotIso}
                      onClick={() => handleBook(slot)}
                      style={isUnavailable ? { opacity: 0.4, textDecoration: "line-through" } : undefined}
                    >
                      {bookingSlot === slotIso
                        ? "Booking..."
                        : slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DoctorDetailPage() {
  return (
    <RequireRole role="patient">
      <DashboardHeader title="Patient Dashboard" links={PATIENT_NAV_LINKS} />
      <div style={{ padding: "1.5rem" }}>
        <BookingView />
      </div>
    </RequireRole>
  );
}
