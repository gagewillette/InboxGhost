import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncUserSince, GmailTokenRow } from "../_shared/syncUser.ts";

// Never look back further than 24 hours to bound compute and API quota.
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
    // Fetch from last_synced_at forward. If never synced or last sync was
    // over 24h ago, cap at 24h — don't blast the Gmail API on every tick.
    const lastSyncedSeconds = row.last_synced_at
      ? Math.floor(new Date(row.last_synced_at).getTime() / 1000)
      : null;

    const sinceSeconds = lastSyncedSeconds
      ? Math.max(lastSyncedSeconds, nowSeconds - MAX_LOOKBACK_SECONDS)
      : nowSeconds - MAX_LOOKBACK_SECONDS;

    try {
      await syncUserSince(supabase, row, sinceSeconds);
      results.push({ user_id: row.user_id, status: "ok", since_seconds: sinceSeconds });
    } catch (err: any) {
      console.error("Error syncing user", row.user_id, err);
      results.push({ user_id: row.user_id, status: "error" });
    }
  }

  return new Response(JSON.stringify({ synced: results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
