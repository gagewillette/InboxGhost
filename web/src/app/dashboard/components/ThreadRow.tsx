"use client";

import { Flame, Minus, ChevronDown, Mail } from "lucide-react";
import type { EmailThread } from "@/app/types";

type ThreadRowProps = {
  thread: EmailThread;
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ImportanceBadge({ level }: { level?: "high" | "med" | "low" }) {
  if (!level) return null;
  const map = {
    high: { icon: <Flame size={11} strokeWidth={1.5} />, label: "High", cls: "ig-badge--high" },
    med:  { icon: <Minus size={11} strokeWidth={1.5} />, label: "Med",  cls: "ig-badge--med" },
    low:  { icon: <ChevronDown size={11} strokeWidth={1.5} />, label: "Low", cls: "ig-badge--low" },
  };
  const { icon, label, cls } = map[level];
  return (
    <span className={`ig-badge ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

export default function ThreadRow({ thread }: ThreadRowProps) {
  return (
    <div className="ig-thread-row" role="listitem" tabIndex={0}>
      <div className="ig-thread-icon">
        <Mail size={15} strokeWidth={1.5} />
      </div>

      <div className="ig-thread-body">
        <div className="ig-thread-top">
          <span className="ig-thread-subject">{thread.subject || "(no subject)"}</span>
          <div className="ig-thread-meta">
            <ImportanceBadge level={thread.importance} />
            <span className="ig-thread-time">{formatRelativeTime(thread.last_message_at)}</span>
          </div>
        </div>
        <span className="ig-thread-sender">{thread.sender}</span>
      </div>
    </div>
  );
}
