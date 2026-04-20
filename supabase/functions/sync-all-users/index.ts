import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncUser, GmailTokenRow } from "../_shared/syncUser.ts";

// Invoked on a schedule via pg_cron or Supabase's scheduled functions.
// Schedule: every 30 minutes
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

  const results: { user_id: string; status: string }[] = [];

  for (const row of data as GmailTokenRow[]) {
    try {
      await syncUser(supabase, row);
      results.push({ user_id: row.user_id, status: "ok" });
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
