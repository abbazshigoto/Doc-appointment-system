"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";
import type { UserRole } from "./types";

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role !== role) {
      router.replace(`/${user.role}`);
    }
  }, [isLoading, user, role, router]);

  if (isLoading || !user || user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
