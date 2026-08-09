"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(`/${user.role}`);
    }
  }, [isLoading, user, router]);

  if (isLoading || user) return null;

  return (
    <div className="page-center">
      <div className="card">
        <h1>Doctor Appointment System</h1>
        <p className="subtitle">Book, manage, and track appointments in one place.</p>
        <div className="form">
          <Link className="button" href="/login" style={{ textAlign: "center" }}>
            Log in
          </Link>
          <Link className="button-link" href="/register" style={{ textAlign: "center" }}>
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}