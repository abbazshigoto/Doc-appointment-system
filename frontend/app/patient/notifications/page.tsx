"use client";

import { useEffect, useState } from "react";
import { listMyNotifications } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/lib/dashboard-header";
import { PATIENT_NAV_LINKS } from "@/lib/nav-links";
import { RequireRole } from "@/lib/require-role";
import type { NotificationResponse } from "@/lib/types";

function NotificationList() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listMyNotifications(token)
      .then(setNotifications)
      .catch(() => setError("Could not load notifications"));
  }, [token]);

  if (error) return <div className="error-banner">{error}</div>;
  if (notifications === null) return <p>Loading notifications...</p>;
  if (notifications.length === 0) return <p>You have no notifications yet.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "640px" }}>
      {notifications.map((notification) => (
        <div key={notification.id} className="card" style={{ maxWidth: "none" }}>
          <p>{notification.message}</p>
          <p style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.35rem" }}>
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RequireRole role="patient">
      <DashboardHeader title="Patient Dashboard" links={PATIENT_NAV_LINKS} />
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Notifications</h1>
        <NotificationList />
      </div>
    </RequireRole>
  );
}
