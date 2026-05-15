/**
 * gmailApi.ts — thin typed wrappers around the Gmail REST API v1
 *
 * All functions require a valid OAuth2 access token. Token refresh is handled
 * upstream by `gmailAuth.getValidAccessToken` before calling anything here.
 *
 * Gmail query behaviour:
 *  - Threads in Social / Promotions categories are excluded from all queries
 *    to keep InboxGhost focused on primary inbox mail.
 *  - Date ranges use Gmail's `YYYY/MM/DD` format which is interpreted in the
 *    user's account timezone on Google's side, not UTC.
 */

import { log } from "./logger.ts";

const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1";

/** Generic authenticated GET against the Gmail API. Throws on non-2xx. */
async function gmailRequest<T>(accessToken: string, path: string): Promise<T> {
  const url = `${GMAIL_API_URL}${path}`;
  log("GET", url);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  log("response status", res.status, res.statusText);
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Format a Date as `YYYY/MM/DD` for use in Gmail search queries. */
function toGmailDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/**
 * List inbox thread IDs for a single calendar day.
 *
 * @param daysBack  0 = today, 1 = yesterday, N = N days ago (relative to the
 *                  server's local date at call time).
 *
 * The query window is [after, before) so each day fetches exactly 24 hours with
 * no overlap or gap between adjacent calls. Up to 100 threads are returned per
 * call; pagination is not implemented because InboxGhost targets a personal
 * inbox, not a high-volume mailbox.
 */
export async function listThreadsForDay(
  accessToken: string,
  daysBack: number,
  baseDate: Date = new Date()
): Promise<{ threads?: { id: string }[] }> {
  const after = new Date(baseDate);
  after.setDate(after.getDate() - daysBack);
  const before = new Date(baseDate);
  before.setDate(before.getDate() - daysBack + 1);

  const query = `in:inbox -category:social -category:promotions after:${toGmailDate(after)} before:${toGmailDate(before)}`;
  log(`listThreadsForDay daysBack=${daysBack} query="${query}"`);

  const result = await gmailRequest<{ threads?: { id: string }[] }>(
    accessToken,
    `/users/me/threads?maxResults=100&q=${encodeURIComponent(query)}`
  );
  log(`listThreadsForDay → ${result.threads?.length ?? 0} thread(s)`);
  return result;
}

/**
 * List inbox thread IDs received after a Unix epoch timestamp (seconds).
 * Used by the background cron (`sync-all-users`) which tracks an absolute
 * cursor rather than a day-relative offset.
 */
export async function listThreadsSince(
  accessToken: string,
  sinceEpochSeconds: number
): Promise<{ threads?: { id: string }[] }> {
  const query = `in:inbox -category:social -category:promotions after:${sinceEpochSeconds}`;
  log(`listThreadsSince sinceEpochSeconds=${sinceEpochSeconds} query="${query}"`);

  const result = await gmailRequest<{ threads?: { id: string }[] }>(
    accessToken,
    `/users/me/threads?maxResults=100&q=${encodeURIComponent(query)}`
  );
  log(`listThreadsSince → ${result.threads?.length ?? 0} thread(s)`);
  return result;
}

/**
 * Fetch the message ID list for a thread.
 *
 * Uses `format=metadata` — this returns only message IDs and metadata headers,
 * not bodies, which is significantly cheaper in quota. Full message content is
 * fetched per-message via `getMessage`.
 */
export function getThread(
  accessToken: string,
  threadId: string
): Promise<{ messages: { id: string }[] }> {
  return gmailRequest(accessToken, `/users/me/threads/${threadId}?format=metadata`);
}

/**
 * Fetch a full message including the complete MIME payload (headers + body parts).
 * `format=full` is required to access multipart body content and attachment
 * metadata. Each call costs one Gmail API read quota unit.
 */
// deno-lint-ignore no-explicit-any
export function getMessage(accessToken: string, messageId: string): Promise<any> {
  return gmailRequest(accessToken, `/users/me/messages/${messageId}?format=full`);
}

/**
 * Fetch the raw binary content of a Gmail attachment by its attachment ID.
 *
 * Gmail does not inline attachment bodies in `getMessage` responses — they are
 * only available through this separate endpoint. The returned `data` field is
 * URL-safe base64 encoded (uses `-` and `_` instead of `+` and `/`), which must
 * be normalized before passing to `atob()`.
 *
 * @returns `{ data: string, size: number }` where `data` is URL-safe base64.
 */
export function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<{ data: string; size: number }> {
  return gmailRequest(
    accessToken,
    `/users/me/messages/${messageId}/attachments/${attachmentId}`
  );
}
