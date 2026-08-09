"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listDoctors } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/lib/avatar";
import type { DoctorResponse } from "@/lib/types";

function DoctorCardSkeleton() {
  return (
    <div className="card" style={{ maxWidth: "none" }}>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
        <div className="skeleton" style={{ width: "48px", height: "48px", borderRadius: "50%" }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: "0.9rem", width: "70%", marginBottom: "0.4rem" }} />
          <div className="skeleton" style={{ height: "0.7rem", width: "50%" }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: "0.8rem", width: "60%" }} />
    </div>
  );
}

function DoctorList() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState<DoctorResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  useEffect(() => {
    if (!token) return;
    listDoctors(token)
      .then(setDoctors)
      .catch(() => setError("Could not load doctors"));
  }, [token]);

  const availableSpecialties = useMemo(
    () => Array.from(new Set((doctors ?? []).map((d) => d.specialty))).sort(),
    [doctors]
  );

  const filteredDoctors = useMemo(() => {
    if (!doctors) return [];
    const query = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      const matchesSpecialty = !specialtyFilter || doctor.specialty === specialtyFilter;
      const matchesSearch =
        !query ||
        doctor.user.full_name.toLowerCase().includes(query) ||
        doctor.specialty.toLowerCase().includes(query);
      return matchesSpecialty && matchesSearch;
    });
  }, [doctors, search, specialtyFilter]);

  if (error) return <div className="error-banner">{error}</div>;

  if (doctors === null) {
    return (
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <DoctorCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (doctors.length === 0) return <p style={{ color: "var(--muted)" }}>No doctors have registered yet.</p>;

  return (
    <>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or specialty..."
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
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.6rem 0.75rem",
            fontSize: "0.9rem",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <option value="">All specialties</option>
          {availableSpecialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
      </div>

      {filteredDoctors.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No doctors match your search.</p>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {filteredDoctors.map((doctor) => (
            <Link
              key={doctor.id}
              href={`/patient/doctors/${doctor.id}`}
              className="card"
              style={{ maxWidth: "none" }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
                <Avatar name={doctor.user.full_name} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {doctor.user.full_name}
                  </p>
                  <span className="badge">{doctor.specialty}</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {doctor.years_of_experience} years experience
                </p>
                <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent)" }}>
                  ${doctor.consultation_fee}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default function PatientDashboard() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "1rem" }}>Find a doctor</h1>
      <DoctorList />
    </div>
  );
}
