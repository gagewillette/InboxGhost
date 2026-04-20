"use client";

import { useState } from "react";
import { useEmails } from "../contexts/email_context";
import { supabase } from "@/app/supabase";
import { triggerEmailSync } from "../lib/emails";
import { useGmailStatus } from "../lib/useGmailStatus";
import FilterBar from "./FilterBar";
import ThreadRow from "./ThreadRow";
import EmptyState from "./EmptyState";
import GmailConnect from "./GmailConnect";
import type { ImportanceFilter } from "@/app/types";

export default function EmailViewer() {
  const { threads, loading, refresh, session } = useEmails();
  const [filter, setFilter] = useState<ImportanceFilter>("all");
  const userId = session?.user?.id ?? null;
  const gmailStatus = useGmailStatus(userId);

  const handleSync = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.access_token) return;
    try {
      await triggerEmailSync(s.access_token);
      await refresh();
    } catch (err) {
      console.error("Sync failed:", err);
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
        {loading || gmailStatus === "loading" ? (
          <ThreadListSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState onSync={handleSync} />
        ) : (
          filtered.map((thread) => (
            <ThreadRow key={thread.thread_id} thread={thread} />
          ))
        )}
      </div>
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
