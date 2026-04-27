"use client";

import { useEffect, useRef, useState } from "react";
import { X, Flame, Minus, ChevronDown, Sparkles, Reply } from "lucide-react";
import { useEmails } from "../contexts/email_context";
import HtmlEmailFrame from "./HtmlEmailFrame";
import type { EmailThread } from "@/app/types";

interface Props {
  thread: EmailThread | null;
  onClose: () => void;
}

const HTML_TAG_RE = /<[a-z][\s\S]*?>/i;

function EmailBody({ body, snippet }: { body: string; snippet: string }) {
  const content = body || snippet;
  if (!content) return <span style={{ color: "var(--ig-fg-muted)" }}>(no content)</span>;
  if (HTML_TAG_RE.test(content)) return <HtmlEmailFrame html={content} />;
  return <>{content}</>;
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function EmailDrawer({ thread, onClose }: Props) {
  const { emails } = useEmails();
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Trigger CSS transition after mount, and on open/close
  useEffect(() => {
    if (thread) {
      // tick delay so the translateY transition fires
      const t = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(t);
    } else {
      setVisible(false);
    }
  }, [thread]);

  // Escape key to close
  useEffect(() => {
    if (!thread) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [thread, onClose]);

  // Focus close button when drawer opens
  useEffect(() => {
    if (visible) closeRef.current?.focus();
  }, [visible]);

  const threadEmails = emails
    .filter((e) => e.thread_id === thread?.thread_id)
    .sort((a, b) => b.internal_date - a.internal_date);

  const latest = threadEmails[0];

  return (
    <div
      className={`ig-drawer-overlay${visible ? " is-open" : ""}`}
      aria-hidden={!thread}
    >
      {/* Backdrop */}
      <div className="ig-drawer-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        className="ig-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={thread?.subject ?? "Email"}
      >
        <div className="ig-drawer-handle" aria-hidden="true" />

        {/* Header */}
        <div className="ig-drawer-header">
          <span className="ig-drawer-subject">
            {thread?.subject || "(no subject)"}
          </span>
          <button
            ref={closeRef}
            className="ig-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Meta */}
        <div className="ig-drawer-meta">
          <span className="ig-drawer-sender">{thread?.sender}</span>
          <span className="ig-drawer-time">
            {thread ? formatFullDate(thread.last_message_at) : ""}
          </span>
        </div>

        {/* Body */}
        <div className="ig-drawer-body">
          {!latest ? "(no messages)" : <EmailBody body={latest.body} snippet={latest.snippet} />}
        </div>

        {/* Footer */}
        <div className="ig-drawer-footer">
          {/* Importance */}
          <div className="ig-drawer-importance">
            <span className="ig-drawer-importance-label">Mark as</span>
            <button
              className={`ig-imp-btn ig-imp-btn--high${thread?.importance === "high" ? " is-active" : ""}`}
            >
              <Flame size={10} strokeWidth={1.5} />
              High
            </button>
            <button
              className={`ig-imp-btn ig-imp-btn--med${thread?.importance === "med" ? " is-active" : ""}`}
            >
              <Minus size={10} strokeWidth={1.5} />
              Med
            </button>
            <button
              className={`ig-imp-btn ig-imp-btn--low${thread?.importance === "low" ? " is-active" : ""}`}
            >
              <ChevronDown size={10} strokeWidth={1.5} />
              Low
            </button>
          </div>

          {/* Reply actions */}
          <div className="ig-drawer-actions">
            <button className="ig-ghost-btn ig-ghost-btn-sm">
              <Reply size={13} strokeWidth={1.5} />
              Draft Reply
            </button>
            <button className="ig-btn-accent ig-ghost-btn-sm">
              <Sparkles size={13} strokeWidth={1.5} />
              AI Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
