"use client";

import { useState } from "react";
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

export default function EmailViewer() {
  const { threads, loading, refresh, session } = useEmails();
  const [filter, setFilter] = useState<ImportanceFilter>("all");
  const [daysBack, setDaysBack] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null);
  const userId = session?.user?.id ?? null;
  const gmailStatus = useGmailStatus(userId);

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
    const nextDay = daysBack + 1;
    setLoadingMore(true);
    try {
      await triggerEmailSync(token, nextDay);
      setDaysBack(nextDay);
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
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="ig-load-more-btn"
          >
            <ChevronDown size={14} strokeWidth={1.5} className={loadingMore ? "ig-spin" : ""} />
            {loadingMore ? "Fetching…" : "Load previous day"}
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
