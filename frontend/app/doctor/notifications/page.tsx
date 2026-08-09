"use client";

import { useEffect, useState } from "react";
import { listMyNotifications } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatRelativeTime } from "@/lib/relative-time";
import type { NotificationResponse } from "@/lib/types";

function NotificationSkeleton() {
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <div className="skeleton" style={{ height: "0.9rem", width: "80%", marginBottom: "0.5rem" }} />
      <div className="skeleton" style={{ height: "0.7rem", width: "30%" }} />
    </div>
  );
}

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

  if (notifications === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "640px" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="card" style={{ maxWidth: "480px" }}>
        <p style={{ color: "var(--muted)" }}>You have no notifications yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "640px" }}>
      {notifications.map((notification) => (
        <div key={notification.id} className="card" style={{ maxWidth: "none", display: "flex", gap: "0.75rem" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent)",
              marginTop: "0.45rem",
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.95rem" }}>{notification.message}</p>
            <p
              style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.35rem" }}
              title={new Date(notification.created_at).toLocaleString()}
            >
              {formatRelativeTime(notification.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DoctorNotificationsPage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Notifications</h1>
      <NotificationList />
    </div>
  );
}
