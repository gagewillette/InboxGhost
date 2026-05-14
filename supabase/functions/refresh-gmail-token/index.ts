/**
 * refresh-gmail-token — called once on user login
 *
 * Unconditionally refreshes the user's Gmail OAuth2 access token so it's
 * valid for the full session duration. (Tokens expire in 1 hour from Google;
 * the background cron may not have refreshed one issued just before login.)
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { refreshAccessToken, persistToken, TokenRevokedError } from "../_shared/gmailAuth.ts";
import { CORS, json, corsOk } from "../_shared/cors.ts";
import type { GmailTokenRow } from "../_shared/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Missing access token" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("gmail_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (tokenError || !tokenRow) {
    return json({ refreshed: false, reason: "no_token" }, 200);
  }

  const row = tokenRow as GmailTokenRow;

  try {
    const refreshed = await refreshAccessToken(row.refresh_token);
    await persistToken(supabase, user.id, refreshed.access_token, refreshed.expires_in);
    return json({ refreshed: true }, 200);
  } catch (err) {
    if (err instanceof TokenRevokedError) {
      await supabase.from("gmail_tokens").delete().eq("user_id", user.id);
      return json({ refreshed: false, reason: "needs_reauth" }, 200);
    }
    console.error("Token refresh failed for user:", user.id, err);
    return json({ error: "Token refresh failed" }, 500);
  }
});
