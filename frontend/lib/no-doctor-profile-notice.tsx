"use client";

import Link from "next/link";

export function NoDoctorProfileNotice() {
  return (
    <div className="card" style={{ maxWidth: "480px" }}>
      <p style={{ color: "var(--muted)", marginBottom: "0.75rem" }}>
        You haven&apos;t set up your doctor profile yet. Patients can&apos;t find you or book with you until it&apos;s created.
      </p>
      <Link href="/doctor/profile" className="button" style={{ display: "inline-block" }}>
        Create your profile
      </Link>
    </div>
  );
}
