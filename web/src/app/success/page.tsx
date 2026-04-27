"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

export default function Success() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--ig-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        fontFamily: "var(--ig-sans)",
        color: "var(--ig-fg)",
      }}
    >
      <CheckCircle size={40} strokeWidth={1.5} style={{ color: "var(--ig-accent)" }} />
      <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Gmail connected!</p>
      <p style={{ fontSize: 13, color: "var(--ig-fg-muted)", margin: 0 }}>
        Redirecting to your dashboard…
      </p>
    </div>
  );
}
