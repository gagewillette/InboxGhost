"use client";

import { ArrowLeft, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/supabase";
import { GhostWordmark } from "@/components/landing/GhostLogo";

export default function SettingsHeader() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="ig-header">
      <div className="ig-header-inner">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link
            href="/dashboard"
            className="ig-header-btn"
            aria-label="Back to inbox"
            style={{ gap: "5px" }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span>Inbox</span>
          </Link>
          <div className="ig-divider-v" />
          <GhostWordmark size={18} />
        </div>

        <span
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--ig-fg-dim)",
            letterSpacing: "-0.005em",
            pointerEvents: "none",
          }}
        >
          Settings
        </span>

        <nav className="ig-header-actions">
          <button
            onClick={handleSignOut}
            className="ig-header-btn"
            aria-label="Sign out"
          >
            <LogOut size={15} strokeWidth={1.5} />
            <span>Sign out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
