import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { syncUser, syncUserDayRange } from "../_shared/syncUser.ts";
import { json, corsOk } from "../_shared/cors.ts";
import type { GmailTokenRow } from "../_shared/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Missing access token" }, 401);

  const body = await req.json().catch(() => ({}));
  const fromDay: number = typeof body.from_day === "number" ? body.from_day : 0;
  const toDay: number = typeof body.to_day === "number" ? body.to_day : fromDay;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return json({ error: "Unauthorized" }, 401);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("gmail_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (tokenError || !tokenRow) return json({ error: "Gmail not connected" }, 404);

  try {
    if (fromDay === 0 && toDay === 0) {
      await syncUser(supabase, tokenRow as GmailTokenRow, 0);
    } else {
      await syncUserDayRange(supabase, tokenRow as GmailTokenRow, fromDay, toDay);
    }
    return json({ success: true, from_day: fromDay, to_day: toDay }, 200);
  } catch (err) {
    console.error("Sync failed:", err);
    return json({ error: "Failed to sync inbox" }, 500);
  }
});
