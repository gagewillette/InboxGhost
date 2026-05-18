"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Sparkles, Trash2, X } from "lucide-react";
import { useEmails } from "../contexts/email_context";
import { supabase } from "@/app/supabase";
import { triggerEmailSync, deleteThreads, classifyEmail } from "../lib/emails";
import { useGmailStatus } from "../lib/useGmailStatus";
import FilterBar from "./FilterBar";
import ThreadRow from "./ThreadRow";
import EmptyState from "./EmptyState";
import GmailConnect from "./GmailConnect";
import EmailDrawer from "./EmailDrawer";
import type { ImportanceFilter, EmailThread, UserLabel } from "@/app/types";

const DAYS_INPUT_KEY = "ig_days_back_input";
const FETCHED_KEY = (userId: string) => `ig_fetched_days_back_${userId}`;

function readInt(key: string, fallback = 0): number {
  try {
    const val = localStorage.getItem(key);
    const n = val !== null ? parseInt(val, 10) : fallback;
    return isNaN(n) || n < 0 ? fallback : n;
  } catch { return fallback; }
}

function writeInt(key: string, n: number) {
  try { localStorage.setItem(key, String(n)); } catch {}
}

// ---------- Bulk action bar ----------

type BulkActionBarProps = {
  selectedCount: number;
  totalCount: number;
  classifyingCount: number;
  deleting: boolean;
  onSelectAll: () => void;
  onDeselect: () => void;
  onClassify: () => void;
  onDelete: () => void;
};

function BulkActionBar({
  selectedCount, totalCount, classifyingCount, deleting,
  onSelectAll, onDeselect, onClassify, onDelete,
}: BulkActionBarProps) {
  const classifying = classifyingCount > 0;
  return (
    <div className="ig-bulk-bar">
      <div className="ig-bulk-info">
        <span className="ig-bulk-count">{selectedCount} selected</span>
        <span className="ig-bulk-divider" />
        {selectedCount < totalCount ? (
          <button className="ig-bulk-link" onClick={onSelectAll}>
            Select all {totalCount}
          </button>
        ) : (
          <button className="ig-bulk-link" onClick={onDeselect}>
            Deselect all
          </button>
        )}
      </div>
      <div className="ig-bulk-actions">
        <button
          className="ig-bulk-btn"
          onClick={onClassify}
          disabled={classifying || deleting}
          title="Classify selected with AI"
        >
          <Sparkles size={12} strokeWidth={1.5} />
          {classifying ? `Classifying ${classifyingCount}…` : `Classify ${selectedCount}`}
        </button>
        <button
          className="ig-bulk-btn ig-bulk-btn--danger"
          onClick={onDelete}
          disabled={classifying || deleting}
          title="Delete selected"
        >
          <Trash2 size={12} strokeWidth={1.5} />
          {deleting ? "Deleting…" : `Delete ${selectedCount}`}
        </button>
        <button className="ig-bulk-clear" onClick={onDeselect} aria-label="Clear selection">
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

// ---------- Main component ----------

export default function EmailViewer() {
  const { threads, emails, loading, refresh, session, clearCache, syncResetCount } = useEmails();
  const [filter, setFilter] = useState<ImportanceFilter>("all");
  const [daysBack, setDaysBackState] = useState(0);
  const [fetchedDaysBack, setFetchedDaysBackState] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const [userLabels, setUserLabels] = useState<UserLabel[]>([]);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [classifyingCount, setClassifyingCount] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const lastClickedIndex = useRef<number | null>(null);

  const userId = session?.user?.id ?? null;
  const gmailStatus = useGmailStatus(userId);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("user_labels")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => setUserLabels(data ?? []));
  }, [userId]);

  useEffect(() => {
    setDaysBackState(readInt(DAYS_INPUT_KEY));
    if (userId) setFetchedDaysBackState(readInt(FETCHED_KEY(userId)));
  }, [userId]);

  useEffect(() => {
    if (syncResetCount === 0) return;
    setDaysBackState(0);
    setFetchedDaysBackState(0);
    setSelectedIds(new Set());
    try {
      localStorage.removeItem(DAYS_INPUT_KEY);
      if (userId) localStorage.removeItem(FETCHED_KEY(userId));
    } catch {}
  }, [syncResetCount, userId]);

  const setDaysBack = (n: number) => {
    setDaysBackState(n);
    writeInt(DAYS_INPUT_KEY, n);
  };

  const setFetchedDaysBack = (n: number) => {
    setFetchedDaysBackState(n);
    if (userId) writeInt(FETCHED_KEY(userId), n);
  };

  const getToken = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    return s?.access_token ?? null;
  };

  const handleSync = async () => {
    const token = await getToken();
    if (!token || syncing) return;
    setSyncing(true);
    try {
      await triggerEmailSync(token, 0);
      await refresh();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadMore = async () => {
    const token = await getToken();
    if (!token) return;
    if (daysBack <= fetchedDaysBack) {
      await refresh();
      return;
    }
    setLoadingMore(true);
    try {
      await triggerEmailSync(token, fetchedDaysBack + 1, daysBack);
      setFetchedDaysBack(daysBack);
      await refresh();
    } catch (err) {
      console.error("Load more failed:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = filter === "all"
    ? threads
    : threads.filter((t) => t.importance === filter);

  // Range-aware select handler passed to each ThreadRow.
  const handleSelect = useCallback((threadId: string, index: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (shiftKey && lastClickedIndex.current !== null) {
        const lo = Math.min(lastClickedIndex.current, index);
        const hi = Math.max(lastClickedIndex.current, index);
        const range = filtered.slice(lo, hi + 1).map((t) => t.thread_id);
        const allSelected = range.every((id) => next.has(id));
        range.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      } else {
        if (next.has(threadId)) next.delete(threadId);
        else next.add(threadId);
        lastClickedIndex.current = index;
      }
      return next;
    });
    if (!shiftKey) lastClickedIndex.current = index;
  }, [filtered]);

  const handleSelectAll = () => setSelectedIds(new Set(filtered.map((t) => t.thread_id)));
  const handleDeselect = () => { setSelectedIds(new Set()); lastClickedIndex.current = null; };

  const handleBulkDelete = async () => {
    if (!userId || deleting) return;
    setDeleting(true);
    try {
      await deleteThreads(userId, [...selectedIds]);
      clearCache();
      setSelectedIds(new Set());
      await refresh();
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkClassify = async () => {
    if (classifyingCount > 0) return;
    const token = await getToken();
    if (!token) return;

    const toClassify = filtered.filter((t) => selectedIds.has(t.thread_id));
    setClassifyingCount(toClassify.length);

    for (const thread of toClassify) {
      try {
        const threadEmail = emails.find((e) => e.thread_id === thread.thread_id);
        await classifyEmail(token, {
          thread_id: thread.thread_id,
          subject: thread.subject,
          from_email: thread.sender,
          body: threadEmail?.body ?? threadEmail?.snippet,
          user_labels: userLabels.map((l) => ({ name: l.name, description: l.description })),
        });
      } catch (err) {
        console.error("Failed to classify thread", thread.thread_id, err);
      } finally {
        setClassifyingCount((n) => n - 1);
      }
    }
  };

  const selectionActive = selectedIds.size > 0;

  if (gmailStatus === "disconnected" && userId) {
    return (
      <div className="ig-viewer">
        <GmailConnect userId={userId} />
      </div>
    );
  }

  return (
    <div className="ig-viewer">
      <FilterBar
        active={filter}
        onChange={setFilter}
        onRefresh={refresh}
        loading={loading}
        count={filtered.length}
      />

      {selectionActive && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={filtered.length}
          classifyingCount={classifyingCount}
          deleting={deleting}
          onSelectAll={handleSelectAll}
          onDeselect={handleDeselect}
          onClassify={handleBulkClassify}
          onDelete={handleBulkDelete}
        />
      )}

      <div className="ig-thread-list" role="list">
        {loading || syncing || gmailStatus === "loading" ? (
          <ThreadListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onSync={handleSync} />
        ) : (
          filtered.map((thread, index) => {
            const threadEmail = emails.find((e) => e.thread_id === thread.thread_id);
            return (
              <ThreadRow
                key={thread.thread_id}
                thread={thread}
                index={index}
                onClick={() => !selectionActive && setSelectedThread(thread)}
                onSelect={handleSelect}
                isSelected={selectedIds.has(thread.thread_id)}
                selectionActive={selectionActive}
                userLabels={userLabels}
                getToken={getToken}
                emailBody={threadEmail?.body ?? threadEmail?.snippet}
              />
            );
          })
        )}
      </div>

      {!loading && gmailStatus === "connected" && filtered.length > 0 && (
        <div className="ig-load-more">
          <span className="ig-load-more-label">
            Showing up to {daysBack + 1} day{daysBack + 1 !== 1 ? "s" : ""} back
          </span>
          <input
            type="number"
            min={0}
            value={daysBack}
            onChange={(e) => setDaysBack(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="ig-days-input"
            aria-label="Days back"
          />
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="ig-load-more-btn"
          >
            <ChevronDown size={14} strokeWidth={1.5} className={loadingMore ? "ig-spin" : ""} />
            {loadingMore ? "Fetching…" : "Load"}
          </button>
        </div>
      )}

      <EmailDrawer
        thread={selectedThread}
        onClose={() => setSelectedThread(null)}
      />
    </div>
  );
}

function ThreadListSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="ig-skeleton-row" aria-hidden="true">
          <div className="ig-skeleton-icon" />
          <div className="ig-skeleton-body">
            <div className="ig-skeleton-line ig-skeleton-line--wide" />
            <div className="ig-skeleton-line ig-skeleton-line--narrow" />
          </div>
        </div>
      ))}
    </>
  );
}
