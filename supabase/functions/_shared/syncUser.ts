/**
 * syncUser.ts — core Gmail → Supabase sync logic
 *
 * This module is the heart of InboxGhost's data pipeline. It provides three
 * public entry points that each fetch a different slice of a user's Gmail inbox
 * and upsert the results into the `emails` and `email_threads` tables:
 *
 *   syncUser         — single day (user-initiated, day-relative)
 *   syncUserDayRange — contiguous range of days (user-initiated, load-more)
 *   syncUserSince    — everything after a timestamp (background cron)
 *
 * Thread-level attachment aggregation:
 *   Attachment metadata is stored at both the message level (`emails.attachments`)
 *   and the thread level (`email_threads.attachments`). The thread-level list is
 *   a deduplicated union across all messages in that thread, which lets the UI
 *   show all attachments for a conversation without having to load every message.
 *   Deduplication is keyed on `attachment_id` to handle re-syncing correctly.
 *
 * Token handling:
 *   Each public function calls `getValidAccessToken` once and reuses the
 *   resulting token for all Gmail API calls in that sync run. This avoids
 *   redundant refresh round-trips for multi-day or multi-thread syncs.
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { listThreadsForDay, listThreadsSince, getThread, getMessage } from "./gmailApi.ts";
import { getValidAccessToken, TokenRevokedError } from "./gmailAuth.ts";
import { GmailTokenRow } from "./types.ts";
import parseEmail from "./parseEmail.ts";
import { log, logJson } from "./logger.ts";

export type { GmailTokenRow } from "./types.ts";

/**
 * Fetch full message data for every message in each thread and upsert into the DB.
 *
 * Upsert strategy:
 *  - `emails` rows conflict on `(user_id, message_id)` — re-syncing the same
 *    message updates it in place, which handles edits to drafts or label changes.
 *  - `email_threads` rows conflict on `(user_id, thread_id)` — `last_message_at`
 *    advances as new messages arrive, so the thread list always reflects the most
 *    recent activity.
 *  - Attachment merging fetches the existing thread row first and does a set-union
 *    by `attachment_id` so re-syncing never duplicates attachments.
 */
async function upsertThreadMessages(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  threads: { id: string }[]
): Promise<void> {
  log(`upsertThreadMessages: processing ${threads.length} thread(s) for user ${userId}`);
  for (const thread of threads) {
    log(`  fetching thread ${thread.id}`);
    const threadData = await getThread(accessToken, thread.id);
    log(`  thread ${thread.id} has ${threadData.messages?.length ?? 0} message(s)`);
    for (const msg of threadData.messages) {
      log(`    fetching message ${msg.id}`);
      const fullMsg = await getMessage(accessToken, msg.id);
      const { sender, attachments, ...emailRow } = parseEmail(userId, fullMsg);
      log(`    parsed: subject="${emailRow.subject}" from="${emailRow.from_email}" date=${new Date(emailRow.internal_date).toISOString()} body_length=${emailRow.body.length} content_type=${emailRow.content_type}`);
      logJson(`    full email row`, { ...emailRow, body: emailRow.body.slice(0, 200) + (emailRow.body.length > 200 ? "…" : "") });

      await supabase
        .from("emails")
        .upsert({ ...emailRow, attachments }, { onConflict: "user_id,message_id" });

      // Merge new attachments into the thread-level aggregated list.
      if (attachments.length > 0) {
        const { data: existing } = await supabase
          .from("email_threads")
          .select("attachments")
          .eq("user_id", userId)
          .eq("thread_id", emailRow.thread_id)
          .single();
        const existingIds = new Set(
          ((existing?.attachments ?? []) as { attachment_id: string }[]).map((a) => a.attachment_id)
        );
        const merged = [
          ...(existing?.attachments ?? []),
          ...attachments.filter((a) => !existingIds.has(a.attachment_id)),
        ];
        await supabase.from("email_threads").upsert(
          {
            user_id: userId,
            thread_id: emailRow.thread_id,
            subject: emailRow.subject,
            sender,
            last_message_at: new Date(emailRow.internal_date),
            attachments: merged,
          },
          { onConflict: "user_id,thread_id" }
        );
      } else {
        await supabase.from("email_threads").upsert(
          {
            user_id: userId,
            thread_id: emailRow.thread_id,
            subject: emailRow.subject,
            sender,
            last_message_at: new Date(emailRow.internal_date),
          },
          { onConflict: "user_id,thread_id" }
        );
      }
    }
  }
}

/** Stamp `last_synced_at` on the user's token row after a successful sync.
 *  The background cron uses this timestamp to determine where to start the next
 *  incremental fetch, so it must be updated after every sync — not just cron runs. */
async function markSynced(supabase: SupabaseClient, userId: string): Promise<void> {
  await supabase
    .from("gmail_tokens")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/**
 * Sync a single calendar day's worth of inbox threads for a user.
 *
 * Used for the initial "today" fetch when the user opens the dashboard or
 * manually presses Sync. `daysBack=0` fetches today, `daysBack=1` fetches
 * yesterday, and so on.
 */
export async function syncUser(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  daysBack = 0,
  baseDate = new Date()
): Promise<void> {
  log(`syncUser: user=${tokenRow.user_id} daysBack=${daysBack}`);
  const accessToken = await getValidAccessToken(supabase, tokenRow);
  log("syncUser: access token obtained");
  const { threads = [] } = await listThreadsForDay(accessToken, daysBack, baseDate);
  log(`syncUser: ${threads.length} thread(s) returned`);
  await upsertThreadMessages(supabase, tokenRow.user_id, accessToken, threads);
  await markSynced(supabase, tokenRow.user_id);
  log("syncUser: done");
}

/**
 * Sync a contiguous range of calendar days for a user.
 *
 * Used by the dashboard "Load more" flow when the user requests N days back.
 * The range [fromDay, toDay] is inclusive; both values are relative to today
 * (0 = today, 1 = yesterday, etc.).
 *
 * Each day is fetched independently rather than as a single wide query because
 * Gmail's `after:`/`before:` operators are interpreted in the user's account
 * timezone. A single wide query risks missing or double-counting messages at
 * day boundaries for users in non-UTC timezones.
 *
 * The access token is refreshed once for the entire range and `last_synced_at`
 * is updated once at the end, regardless of how many days are requested.
 */
export async function syncUserDayRange(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  fromDay: number,
  toDay: number,
  baseDate = new Date()
): Promise<void> {
  log(`syncUserDayRange: user=${tokenRow.user_id} fromDay=${fromDay} toDay=${toDay}`);
  const accessToken = await getValidAccessToken(supabase, tokenRow);
  log("syncUserDayRange: access token obtained");
  for (let day = fromDay; day <= toDay; day++) {
    log(`syncUserDayRange: fetching day ${day}`);
    const { threads = [] } = await listThreadsForDay(accessToken, day, baseDate);
    log(`syncUserDayRange: day ${day} → ${threads.length} thread(s)`);
    await upsertThreadMessages(supabase, tokenRow.user_id, accessToken, threads);
  }
  await markSynced(supabase, tokenRow.user_id);
  log("syncUserDayRange: done");
}

/**
 * Sync all inbox threads received after `sinceEpochSeconds`.
 *
 * Used exclusively by the `sync-all-users` background cron. The cron derives
 * this value from each user's `last_synced_at` timestamp, capped at 24 hours
 * in the past to bound Gmail API quota usage.
 */
export async function syncUserSince(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  sinceEpochSeconds: number
): Promise<void> {
  log(`syncUserSince: user=${tokenRow.user_id} sinceEpochSeconds=${sinceEpochSeconds} (${new Date(sinceEpochSeconds * 1000).toISOString()})`);
  const accessToken = await getValidAccessToken(supabase, tokenRow);
  log("syncUserSince: access token obtained");
  const { threads = [] } = await listThreadsSince(accessToken, sinceEpochSeconds);
  log(`syncUserSince: ${threads.length} thread(s) returned`);
  await upsertThreadMessages(supabase, tokenRow.user_id, accessToken, threads);
  await markSynced(supabase, tokenRow.user_id);
  log("syncUserSince: done");
}

export { TokenRevokedError };
