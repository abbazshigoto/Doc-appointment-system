"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { ApiError, createDoctorProfile, getMyDoctorProfile, updateDoctorProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/lib/avatar";
import { SPECIALTIES } from "@/lib/specialties";
import type { DoctorResponse } from "@/lib/types";

function ProfilePreview({
  name,
  specialty,
  bio,
  yearsOfExperience,
  consultationFee,
}: {
  name: string;
  specialty: string;
  bio: string;
  yearsOfExperience: string;
  consultationFee: string;
}) {
  return (
    <div className="card" style={{ maxWidth: "360px" }}>
      <p className="subtitle" style={{ marginBottom: "1rem" }}>How patients see you</p>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
        <Avatar name={name} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600 }}>{name}</p>
          <span className="badge">{specialty}</span>
        </div>
      </div>
      {bio && <p style={{ fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "0.75rem" }}>{bio}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          {yearsOfExperience || "0"} years experience
        </p>
        <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent)" }}>
          ${consultationFee || "0"}
        </p>
      </div>
    </div>
  );
}

function ProfileForm({
  existing,
  onSaved,
}: {
  existing: DoctorResponse | null;
  onSaved: (doctor: DoctorResponse) => void;
}) {
  const { token, user } = useAuth();
  const [specialty, setSpecialty] = useState(existing?.specialty ?? SPECIALTIES[0]);
  const specialtyOptions =
    existing && !SPECIALTIES.includes(existing.specialty as (typeof SPECIALTIES)[number])
      ? [existing.specialty, ...SPECIALTIES]
      : SPECIALTIES;
  const [bio, setBio] = useState(existing?.bio ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(
    existing ? String(existing.years_of_experience) : ""
  );
  const [consultationFee, setConsultationFee] = useState(existing?.consultation_fee ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    setSavedMessage(null);
    setIsSubmitting(true);
    const data = {
      specialty,
      bio: bio || null,
      years_of_experience: Number(yearsOfExperience),
      consultation_fee: Number(consultationFee),
    };
    try {
      const doctor = existing
        ? await updateDoctorProfile(token, data)
        : await createDoctorProfile(token, data);
      onSaved(doctor);
      setSavedMessage(existing ? "Profile updated." : "Profile created — patients can now find you.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="card" style={{ maxWidth: "420px" }}>
        <h1>{existing ? "Edit your profile" : "Create your doctor profile"}</h1>
        <p className="subtitle">
          {existing ? "Keep your details up to date for patients" : "Patients can't find you until this is set up"}
        </p>

        {error && <div className="error-banner">{error}</div>}
        {savedMessage && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "8px", padding: "0.6rem 0.75rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {savedMessage}
          </div>
        )}

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="specialty">Specialty</label>
            <select id="specialty" required value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              {specialtyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bio">Bio</label>
            <input id="bio" type="text" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="years">Years of experience</label>
            <input
              id="years"
              type="number"
              min={0}
              required
              value={yearsOfExperience}
              onChange={(e) => setYearsOfExperience(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fee">Consultation fee ($)</label>
            <input
              id="fee"
              type="number"
              min={0}
              step="0.01"
              required
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
            />
          </div>
          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : existing ? "Save changes" : "Create profile"}
          </button>
        </form>
      </div>

      <ProfilePreview
        name={user?.full_name ?? ""}
        specialty={specialty}
        bio={bio}
        yearsOfExperience={yearsOfExperience}
        consultationFee={consultationFee}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="card" style={{ maxWidth: "420px" }}>
      <div className="skeleton" style={{ height: "1.3rem", width: "60%", marginBottom: "0.75rem" }} />
      <div className="skeleton" style={{ height: "0.85rem", width: "80%", marginBottom: "1.5rem" }} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ marginBottom: "1rem" }}>
          <div className="skeleton" style={{ height: "0.8rem", width: "30%", marginBottom: "0.4rem" }} />
          <div className="skeleton" style={{ height: "2.2rem", width: "100%" }} />
        </div>
      ))}
    </div>
  );
}

function DoctorProfile() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<DoctorResponse | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getMyDoctorProfile(token)
      .then(setProfile)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setProfile(null);
        } else {
          setError("Could not load your profile");
        }
      });
  }, [token]);

  if (error) return <div className="error-banner">{error}</div>;
  if (profile === undefined) return <ProfileSkeleton />;

  return <ProfileForm existing={profile} onSaved={setProfile} />;
}

export default function DoctorProfilePage() {
  return (
    <div style={{ padding: "1.5rem" }}>
      <DoctorProfile />
    </div>
  );
}
