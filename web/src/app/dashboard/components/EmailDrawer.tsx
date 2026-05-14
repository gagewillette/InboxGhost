"use client";

import { useEffect, useRef, useState } from "react";
import { X, Flame, Minus, ChevronDown, Sparkles, Reply, Paperclip, Download, Loader2 } from "lucide-react";
import { useEmails } from "../contexts/email_context";
import HtmlEmailFrame from "./HtmlEmailFrame";
import { supabase } from "@/app/supabase";
import { fetchAttachment } from "../lib/emails";
import type { EmailThread, EmailAttachment } from "@/app/types";

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsPanel({ thread, messageId }: { thread: EmailThread; messageId: string | undefined }) {
  const attachments = thread.attachments ?? [];
  const [fetching, setFetching] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});

  if (attachments.length === 0) return null;

  const doFetch = async (att: EmailAttachment) => {
    if (!messageId || fetching[att.attachment_id] || done[att.attachment_id]) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    setFetching((f) => ({ ...f, [att.attachment_id]: true }));
    try {
      const { url } = await fetchAttachment(token, messageId, att.attachment_id, att.filename, att.mime_type);
      setDone((d) => ({ ...d, [att.attachment_id]: true }));
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename;
      a.click();
    } catch (err) {
      console.error("Attachment fetch failed:", err);
    } finally {
      setFetching((f) => ({ ...f, [att.attachment_id]: false }));
    }
  };

  const doFetchAll = () => attachments.forEach((att) => doFetch(att));

  return (
    <div className="ig-attachments">
      <div className="ig-attachments-header">
        <Paperclip size={13} strokeWidth={1.5} />
        <span>{attachments.length} attachment{attachments.length !== 1 ? "s" : ""}</span>
        <button className="ig-attachments-fetch-all" onClick={doFetchAll}>
          Fetch all
        </button>
      </div>
      <ul className="ig-attachments-list">
        {attachments.map((att) => (
          <li key={att.attachment_id} className="ig-attachment-item">
            <span className="ig-attachment-name">{att.filename}</span>
            <span className="ig-attachment-size">{formatBytes(att.size)}</span>
            <button
              className="ig-attachment-fetch"
              onClick={() => doFetch(att)}
              disabled={fetching[att.attachment_id] || done[att.attachment_id]}
              aria-label={`Fetch ${att.filename}`}
            >
              {fetching[att.attachment_id]
                ? <Loader2 size={12} strokeWidth={1.5} className="ig-spin" />
                : <Download size={12} strokeWidth={1.5} />}
              {done[att.attachment_id] ? "Saved" : "Fetch"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
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

        {/* Attachments */}
        {thread && <AttachmentsPanel thread={thread} messageId={latest?.message_id} />}

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
