"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDoctors } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/lib/dashboard-header";
import { PATIENT_NAV_LINKS } from "@/lib/nav-links";
import { RequireRole } from "@/lib/require-role";
import type { DoctorResponse } from "@/lib/types";

function DoctorList() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState<DoctorResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listDoctors(token)
      .then(setDoctors)
      .catch(() => setError("Could not load doctors"));
  }, [token]);

  if (error) return <div className="error-banner">{error}</div>;
  if (doctors === null) return <p>Loading doctors...</p>;
  if (doctors.length === 0) return <p>No doctors have registered yet.</p>;

  return (
    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {doctors.map((doctor) => (
        <Link
          key={doctor.id}
          href={`/patient/doctors/${doctor.id}`}
          className="card"
          style={{ maxWidth: "none" }}
        >
          <h1 style={{ fontSize: "1.1rem" }}>{doctor.user.full_name}</h1>
          <p className="subtitle" style={{ marginBottom: "0.75rem" }}>
            {doctor.specialty}
          </p>
          <p style={{ fontSize: "0.9rem" }}>{doctor.years_of_experience} years experience</p>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>${doctor.consultation_fee} per visit</p>
        </Link>
      ))}
    </div>
  );
}

export default function PatientDashboard() {
  return (
    <RequireRole role="patient">
      <DashboardHeader title="Patient Dashboard" links={PATIENT_NAV_LINKS} />
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Find a doctor</h1>
        <DoctorList />
      </div>
    </RequireRole>
  );
}
