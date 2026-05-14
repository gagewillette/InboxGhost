/**
 * sync-all-users — background cron edge function
 *
 * Iterates every row in `gmail_tokens` and syncs each user's inbox forward
 * from their `last_synced_at` timestamp. Invoked on a schedule via the Supabase
 * cron system using the service-role key — this function is not reachable or
 * callable by end users.
 *
 * Sync window:
 *   Each user's sync starts from `max(last_synced_at, now - 24h)`. The 24-hour
 *   cap prevents unbounded Gmail API quota usage for users whose accounts have
 *   been idle for a long time (e.g. after a deploy gap). New users who have
 *   never been synced also use the 24-hour lookback.
 *
 * Error isolation:
 *   Each user is synced inside an individual try/catch. A bad token or transient
 *   Gmail error for one user does not abort the run — the error is logged and
 *   recorded in the result, and processing continues for all remaining users.
 *
 * Token revocation handling:
 *   If a user's refresh token has been permanently revoked (`TokenRevokedError`),
 *   `syncUserSince` deletes the token row from the DB as a side-effect. The
 *   status for that user is recorded as "revoked" so it's visible in cron logs.
 *   On their next login the UI will prompt them to re-connect Gmail.
 *
 * Response (200):
 *   { synced: Array<{ user_id, status, since_seconds? }> }
 *   status values: "ok" | "revoked" | "error"
 *
 * Error responses:
 *   500  Failed to fetch the `gmail_tokens` table (DB connection issue)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncUserSince, TokenRevokedError } from "../_shared/syncUser.ts";
import type { GmailTokenRow } from "../_shared/types.ts";

/** Maximum number of seconds to look back regardless of `last_synced_at`. */
const MAX_LOOKBACK_SECONDS = 24 * 60 * 60;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.from("gmail_tokens").select("*");

  if (error) {
    console.error("Failed to fetch users:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch users" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const results: { user_id: string; status: string; since_seconds?: number }[] = [];

  for (const row of data as GmailTokenRow[]) {
    const lastSyncedSeconds = row.last_synced_at
      ? Math.floor(new Date(row.last_synced_at).getTime() / 1000)
      : null;

    // Use last_synced_at if available, but cap at 24 hours in the past.
    const sinceSeconds = lastSyncedSeconds
      ? Math.max(lastSyncedSeconds, nowSeconds - MAX_LOOKBACK_SECONDS)
      : nowSeconds - MAX_LOOKBACK_SECONDS;

    try {
      await syncUserSince(supabase, row, sinceSeconds);
      results.push({ user_id: row.user_id, status: "ok", since_seconds: sinceSeconds });
    } catch (err) {
      if (err instanceof TokenRevokedError) {
        console.warn("Revoked token removed for user", row.user_id, "— re-auth required");
        results.push({ user_id: row.user_id, status: "revoked" });
      } else {
        console.error("Error syncing user", row.user_id, err);
        results.push({ user_id: row.user_id, status: "error" });
      }
    }
  }

  return new Response(JSON.stringify({ synced: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
