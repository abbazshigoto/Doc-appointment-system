"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { ApiError, createAvailabilityWindow, deleteAvailabilityWindow, listMyAvailability } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import { NoDoctorProfileNotice } from "@/lib/no-doctor-profile-notice";
import type { AvailabilityWindowResponse } from "@/lib/types";

function WindowCardSkeleton() {
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <div className="skeleton" style={{ height: "0.9rem", width: "50%", marginBottom: "0.5rem" }} />
      <div className="skeleton" style={{ height: "0.75rem", width: "35%" }} />
    </div>
  );
}

function AvailabilityManager() {
  const { token } = useAuth();
  const [windows, setWindows] = useState<AvailabilityWindowResponse[] | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AvailabilityWindowResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    listMyAvailability(token)
      .then(setWindows)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNeedsProfile(true);
        } else {
          setError("Could not load your availability");
        }
      });
  }, [token]);

  async function handleAdd(event: SubmitEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createAvailabilityWindow(token, {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      });
      setWindows((prev) => (prev ? [...prev, created].sort((a, b) => a.start_time.localeCompare(b.start_time)) : [created]));
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this window");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(windowId: number) {
    if (!token) return;
    setDeletingId(windowId);
    setError(null);
    try {
      await deleteAvailabilityWindow(token, windowId);
      setWindows((prev) => (prev ? prev.filter((w) => w.id !== windowId) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this window");
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  if (needsProfile) return <NoDoctorProfileNotice />;

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="card" style={{ maxWidth: "420px" }}>
        <h1>Add availability</h1>
        <p className="subtitle">Patients can book any 30-minute slot inside a window you add</p>

        {error && <div className="error-banner">{error}</div>}

        <form className="form" onSubmit={handleAdd}>
          <div className="field">
            <label htmlFor="start">Starts</label>
            <input
              id="start"
              type="datetime-local"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="end">Ends</label>
            <input
              id="end"
              type="datetime-local"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add window"}
          </button>
        </form>
      </div>

      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Your windows</h2>

        {windows === null && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <WindowCardSkeleton key={i} />
            ))}
          </div>
        )}

        {windows?.length === 0 && (
          <div className="card" style={{ maxWidth: "none" }}>
            <p style={{ color: "var(--muted)" }}>No availability posted yet. Add one to start getting bookings.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {windows?.map((window) => {
            const dayLabel = new Date(window.start_time).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            });
            return (
              <div
                key={window.id}
                className="card"
                style={{ maxWidth: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div>
                  <p style={{ fontWeight: 600 }}>{dayLabel}</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    {new Date(window.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                    {new Date(window.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button
                  className="button-link-danger"
                  disabled={deletingId === window.id}
                  onClick={() => setPendingDelete(window)}
                >
                  {deletingId === window.id ? "Removing..." : "Remove"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this window?"
        message={
          pendingDelete
            ? `Patients will no longer be able to book ${new Date(pendingDelete.start_time).toLocaleString()} – ${new Date(
                pendingDelete.end_time
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
            : ""
        }
        confirmLabel="Remove window"
        cancelLabel="Keep it"
        danger
        isConfirming={deletingId !== null}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default function DoctorAvailabilityPage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <AvailabilityManager />
    </div>
  );
}
