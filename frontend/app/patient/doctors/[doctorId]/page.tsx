"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, bookAppointment, getDoctor, listBookedSlots, listDoctorAvailability } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import { generateSlots } from "@/lib/slots";
import type { AvailabilityWindowResponse, BookedSlotResponse, DoctorResponse } from "@/lib/types";

const SLOT_DURATION_MS = 30 * 60_000;

function isSlotBooked(slot: Date, bookedSlots: BookedSlotResponse[]): boolean {
  const slotStart = slot.getTime();
  const slotEnd = slotStart + SLOT_DURATION_MS;
  return bookedSlots.some((booked) => {
    const bookedStart = new Date(booked.start_time).getTime();
    const bookedEnd = new Date(booked.end_time).getTime();
    return slotStart < bookedEnd && bookedStart < slotEnd;
  });
}

function BookingView() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams<{ doctorId: string }>();
  const doctorId = Number(params.doctorId);

  const [doctor, setDoctor] = useState<DoctorResponse | null>(null);
  const [windows, setWindows] = useState<AvailabilityWindowResponse[] | null>(null);
  const [bookedSlots, setBookedSlots] = useState<BookedSlotResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<Date | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    Promise.all([getDoctor(token, doctorId), listDoctorAvailability(token, doctorId), listBookedSlots(token, doctorId)])
      .then(([doctorData, windowsData, bookedData]) => {
        setDoctor(doctorData);
        setWindows(windowsData);
        setBookedSlots(bookedData);
      })
      .catch(() => setError("Could not load this doctor"));
  }, [token, doctorId]);

  async function handleConfirmBooking() {
    if (!token || !pendingSlot) return;
    const slotIso = pendingSlot.toISOString();
    setIsBooking(true);
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
      setIsBooking(false);
      setPendingSlot(null);
    }
  }

  if (error && !doctor) return <div className="error-banner">{error}</div>;
  if (doctor === null || windows === null) return <p>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "680px" }}>
      <Link href="/patient" className="button-link" style={{ width: "fit-content" }}>
        ← Back to doctors
      </Link>

      <div className="card" style={{ maxWidth: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.4rem" }}>{doctor.user.full_name}</h1>
            <span className="badge">{doctor.specialty}</span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>
              ${doctor.consultation_fee}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)" }}>per visit</p>
          </div>
        </div>

        {doctor.bio && (
          <p style={{ marginTop: "1rem", fontSize: "0.9rem", lineHeight: 1.5 }}>{doctor.bio}</p>
        )}
        <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--muted)" }}>
          {doctor.years_of_experience} years of experience
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Available times</h2>
        {windows.length === 0 && (
          <div className="card" style={{ maxWidth: "none" }}>
            <p style={{ color: "var(--muted)" }}>No availability posted yet. Check back later.</p>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {windows.map((window) => {
            const slots = generateSlots(window.start_time, window.end_time);
            const dayLabel = new Date(window.start_time).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
            return (
              <div key={window.id} className="card" style={{ maxWidth: "none" }}>
                <p style={{ fontWeight: 600, marginBottom: "0.15rem" }}>{dayLabel}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "1rem" }}>
                  {new Date(window.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {new Date(window.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: "0.5rem" }}>
                  {slots.map((slot) => {
                    const slotIso = slot.toISOString();
                    const isUnavailable = unavailableSlots.has(slotIso) || isSlotBooked(slot, bookedSlots);
                    return (
                      <button
                        key={slotIso}
                        className="button"
                        disabled={isUnavailable}
                        onClick={() => setPendingSlot(slot)}
                        title={isUnavailable ? "Already booked" : undefined}
                        style={
                          isUnavailable
                            ? { opacity: 0.45, background: "var(--border)", color: "var(--muted)", cursor: "not-allowed" }
                            : undefined
                        }
                      >
                        {isUnavailable ? "Booked" : slot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={pendingSlot !== null}
        title="Confirm your appointment"
        message={
          pendingSlot
            ? `Book with ${doctor.user.full_name} on ${pendingSlot.toLocaleString()} for $${doctor.consultation_fee}?`
            : ""
        }
        confirmLabel="Book appointment"
        cancelLabel="Go back"
        isConfirming={isBooking}
        onConfirm={handleConfirmBooking}
        onCancel={() => setPendingSlot(null)}
      />
    </div>
  );
}

export default function DoctorDetailPage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <BookingView />
    </div>
  );
}
