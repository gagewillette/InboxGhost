"use client";

import { Wifi, Trash2, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/supabase";
import { useEmails } from "../contexts/email_context";
import { triggerEmailSync, deleteAllEmails } from "../lib/emails";
import { GhostLogo, GhostWordmark } from "@/components/landing/GhostLogo";

export default function Header() {
  const { refresh } = useEmails();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [nuking, setNuking] = useState(false);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleSync = async () => {
    const token = await getToken();
    if (!token) return;
    setSyncing(true);
    try {
      await triggerEmailSync(token);
      await refresh();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleNuke = async () => {
    const token = await getToken();
    if (!token) return;
    setNuking(true);
    try {
      await deleteAllEmails(token);
      await refresh();
    } catch (err) {
      console.error("Nuke failed:", err);
    } finally {
      setNuking(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="ig-header">
      <div className="ig-header-inner">
        <div className="ig-brand">
          <GhostLogo size={26} stroke={1.5} eyes={false} />
          <GhostWordmark size={15} />
        </div>

        <nav className="ig-header-actions">
          <HeaderButton
            onClick={handleSync}
            disabled={syncing}
            icon={<Wifi size={15} strokeWidth={1.5} />}
            label={syncing ? "Syncing…" : "Sync"}
          />
          <HeaderButton
            onClick={handleNuke}
            disabled={nuking}
            icon={<Trash2 size={15} strokeWidth={1.5} />}
            label={nuking ? "Nuking…" : "Nuke DB"}
            danger
          />
          <div className="ig-divider-v" />
          <HeaderButton
            onClick={handleSignOut}
            icon={<LogOut size={15} strokeWidth={1.5} />}
            label="Sign out"
          />
        </nav>
      </div>
    </header>
  );
}

type HeaderButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
};

function HeaderButton({ onClick, disabled, icon, label, danger }: HeaderButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`ig-header-btn${danger ? " ig-header-btn--danger" : ""}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
