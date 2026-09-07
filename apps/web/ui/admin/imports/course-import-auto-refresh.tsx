"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function CourseImportAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => router.refresh(), 3_000);
    return () => window.clearInterval(interval);
  }, [active, router]);

  return null;
}
