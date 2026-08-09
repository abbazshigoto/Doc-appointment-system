"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, deactivateUser, listAllUsers, reactivateUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ConfirmDialog } from "@/lib/confirm-dialog";
import type { UserResponse, UserRole } from "@/lib/types";

function roleBadgeStyle(role: UserRole): React.CSSProperties {
  if (role === "admin") {
    return { background: "transparent", border: "1px solid var(--foreground)", color: "var(--foreground)" };
  }
  if (role === "doctor") {
    return { background: "var(--accent)", color: "var(--accent-foreground)" };
  }
  return { background: "var(--accent-secondary)", color: "var(--accent-foreground)" };
}

function TableSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: "2.5rem", width: "100%" }} />
      ))}
    </div>
  );
}

function UserTable() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<UserResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    listAllUsers(token)
      .then(setUsers)
      .catch(() => setError("Could not load users"));
  }, [token]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesSearch =
        !query || u.full_name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
      return matchesRole && matchesSearch;
    });
  }, [users, search, roleFilter]);

  async function handleDeactivate(userId: number) {
    if (!token) return;
    setPendingId(userId);
    setError(null);
    try {
      const updated = await deactivateUser(token, userId);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not deactivate this user");
    } finally {
      setPendingId(null);
      setPendingDeactivate(null);
    }
  }

  async function handleReactivate(userId: number) {
    if (!token) return;
    setPendingId(userId);
    setError(null);
    try {
      const updated = await reactivateUser(token, userId);
      setUsers((prev) => (prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reactivate this user");
    } finally {
      setPendingId(null);
    }
  }

  if (error && !users) return <div className="error-banner">{error}</div>;
  if (users === null) return <TableSkeleton />;

  return (
    <>
      {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 240px",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.6rem 0.75rem",
            fontSize: "0.9rem",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.6rem 0.75rem",
            fontSize: "0.9rem",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All roles</option>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="card" style={{ maxWidth: "none", padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => {
              const isSelf = currentUser?.id === u.id;
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ color: "var(--muted)" }}>{u.email}</td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.55rem",
                        borderRadius: "999px",
                        textTransform: "capitalize",
                        ...roleBadgeStyle(u.role),
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.55rem",
                        borderRadius: "999px",
                        background: u.is_active ? "var(--accent-secondary)" : "var(--danger-bg)",
                        color: u.is_active ? "var(--accent-foreground)" : "var(--danger)",
                      }}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {isSelf ? (
                      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>You</span>
                    ) : u.is_active ? (
                      <button
                        className="button-link-danger"
                        disabled={pendingId === u.id}
                        onClick={() => setPendingDeactivate(u)}
                      >
                        {pendingId === u.id ? "Working..." : "Deactivate"}
                      </button>
                    ) : (
                      <button
                        className="button-link"
                        disabled={pendingId === u.id}
                        onClick={() => handleReactivate(u.id)}
                      >
                        {pendingId === u.id ? "Working..." : "Reactivate"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <p style={{ padding: "1.5rem", color: "var(--muted)", textAlign: "center" }}>No users match your search.</p>
        )}
      </div>

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate this account?"
        message={
          pendingDeactivate
            ? `${pendingDeactivate.full_name} (${pendingDeactivate.email}) will no longer be able to log in until reactivated.`
            : ""
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        danger
        isConfirming={pendingId !== null}
        onConfirm={() => pendingDeactivate && handleDeactivate(pendingDeactivate.id)}
        onCancel={() => setPendingDeactivate(null)}
      />
    </>
  );
}

export default function AdminDashboard() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Users</h1>
      <UserTable />
    </div>
  );
}
