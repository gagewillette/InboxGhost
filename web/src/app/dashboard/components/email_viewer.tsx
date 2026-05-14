"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useEmails } from "../contexts/email_context";
import { supabase } from "@/app/supabase";
import { triggerEmailSync } from "../lib/emails";
import { useGmailStatus } from "../lib/useGmailStatus";
import FilterBar from "./FilterBar";
import ThreadRow from "./ThreadRow";
import EmptyState from "./EmptyState";
import GmailConnect from "./GmailConnect";
import EmailDrawer from "./EmailDrawer";
import type { ImportanceFilter, EmailThread } from "@/app/types";

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

export function resetFetchedDaysBack(userId: string) {
  try { localStorage.removeItem(FETCHED_KEY(userId)); } catch {}
}

export default function EmailViewer() {
  const { threads, loading, refresh, session } = useEmails();
  const [filter, setFilter] = useState<ImportanceFilter>("all");
  const [daysBack, setDaysBackState] = useState(0);
  const [fetchedDaysBack, setFetchedDaysBackState] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const userId = session?.user?.id ?? null;
  const gmailStatus = useGmailStatus(userId);

  useEffect(() => {
    setDaysBackState(readInt(DAYS_INPUT_KEY));
    if (userId) setFetchedDaysBackState(readInt(FETCHED_KEY(userId)));
  }, [userId]);

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
      // All requested days are already in the DB — just refresh the display.
      await refresh();
      return;
    }

    setLoadingMore(true);
    try {
      // Only fetch the days we don't have yet.
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

      <div className="ig-thread-list" role="list">
        {loading || syncing || gmailStatus === "loading" ? (
          <ThreadListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onSync={handleSync} />
        ) : (
          filtered.map((thread) => (
            <ThreadRow
              key={thread.thread_id}
              thread={thread}
              onClick={() => setSelectedThread(thread)}
            />
          ))
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
