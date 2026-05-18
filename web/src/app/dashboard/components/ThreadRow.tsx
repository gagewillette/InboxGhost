"use client";

import { useState } from "react";
import { Flame, Minus, ChevronDown, Mail, Sparkles, Check } from "lucide-react";
import type { EmailThread, UserLabel } from "@/app/types";
import { classifyEmail } from "../lib/emails";

type ClassificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; importance: "high" | "med" | "low"; labels: string[] }
  | { status: "error" };

type ThreadRowProps = {
  thread: EmailThread;
  index: number;
  onClick: () => void;
  onSelect: (threadId: string, index: number, shiftKey: boolean) => void;
  isSelected: boolean;
  selectionActive: boolean;
  userLabels: UserLabel[];
  getToken: () => Promise<string | null>;
  emailBody?: string;
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

function LabelChip({ label, userLabels }: { label: string; userLabels: UserLabel[] }) {
  const match = userLabels.find((l) => l.name === label);
  const color = match?.color;
  const style = color
    ? {
        background: `color-mix(in oklch, ${color} 16%, transparent)`,
        color,
        borderColor: `color-mix(in oklch, ${color} 28%, transparent)`,
      }
    : undefined;
  return (
    <span className="ig-thread-label-chip" style={style}>
      {label}
    </span>
  );
}

function ClassificationRow({
  state,
  userLabels,
}: {
  state: ClassificationState;
  userLabels: UserLabel[];
}) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    return (
      <div className="ig-thread-classification">
        <div className="ig-thread-classify-skeleton" />
        <div className="ig-thread-classify-skeleton ig-thread-classify-skeleton--short" />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="ig-thread-classification">
        <span className="ig-thread-classify-error">Classification failed</span>
      </div>
    );
  }

  return (
    <div className="ig-thread-classification">
      <ImportanceBadge level={state.importance} />
      {state.labels.length > 0 && (
        <>
          <span className="ig-thread-classify-dot" aria-hidden="true">·</span>
          {state.labels.map((l) => (
            <LabelChip key={l} label={l} userLabels={userLabels} />
          ))}
        </>
      )}
    </div>
  );
}

export default function ThreadRow({
  thread, index, onClick, onSelect, isSelected, selectionActive, userLabels, getToken, emailBody,
}: ThreadRowProps) {
  const [classification, setClassification] = useState<ClassificationState>({ status: "idle" });

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(thread.thread_id, index, e.shiftKey);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (selectionActive) {
      onSelect(thread.thread_id, index, e.shiftKey);
    } else {
      onClick();
    }
  };

  const handleClassify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (classification.status === "loading") return;
    setClassification({ status: "loading" });
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const result = await classifyEmail(token, {
        thread_id: thread.thread_id,
        subject: thread.subject,
        from_email: thread.sender,
        body: emailBody,
        user_labels: userLabels.map((l) => ({ name: l.name, description: l.description })),
      });
      setClassification({ status: "done", importance: result.importance, labels: result.labels });
    } catch {
      setClassification({ status: "error" });
    }
  };

  return (
    <div
      className={`ig-thread-row${isSelected ? " ig-thread-row--selected" : ""}`}
      role="listitem"
      tabIndex={0}
      onClick={handleRowClick}
      onMouseDown={(e) => { if (e.shiftKey) e.preventDefault(); }}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Checkbox / mail icon area */}
      <div
        className={`ig-thread-icon ig-thread-icon--selectable${isSelected ? " ig-thread-icon--checked" : ""}`}
        onClick={handleCheckboxClick}
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Select "${thread.subject}"`}
      >
        {isSelected ? (
          <Check size={13} strokeWidth={2.5} />
        ) : (
          <Mail size={15} strokeWidth={1.5} className="ig-thread-mail-icon" />
        )}
      </div>

      <div className="ig-thread-body">
        <div className="ig-thread-top">
          <span className="ig-thread-subject">{thread.subject || "(no subject)"}</span>
          <div className="ig-thread-meta">
            <span className="ig-thread-time">{formatRelativeTime(thread.last_message_at)}</span>

            {!selectionActive && (
              <button
                className="ig-thread-classify-btn"
                onClick={handleClassify}
                disabled={classification.status === "loading"}
                title="Classify with AI"
                aria-label="Classify email with AI"
              >
                <Sparkles size={12} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {classification.status === "idle" && (thread.importance || (thread.labels?.length ?? 0) > 0) && (
          <div className="ig-thread-classification">
            <ImportanceBadge level={thread.importance} />
            {(thread.labels?.length ?? 0) > 0 && (
              <>
                <span className="ig-thread-classify-dot" aria-hidden="true">·</span>
                {thread.labels!.map((l) => (
                  <LabelChip key={l} label={l} userLabels={userLabels} />
                ))}
              </>
            )}
          </div>
        )}
        {classification.status !== "idle" && (
          <ClassificationRow state={classification} userLabels={userLabels} />
        )}

        <span className="ig-thread-sender">{thread.sender}</span>
      </div>
    </div>
  );
}
