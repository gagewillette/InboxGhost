/**
 * refresh-gmail-token — proactive token refresh on user login
 *
 * Called once when the user signs into InboxGhost (via the `onAuthStateChange`
 * SIGNED_IN event in EmailContext). Its sole purpose is to ensure the stored
 * Gmail access token is fresh for the entire session duration.
 *
 * Why this exists:
 *   Google access tokens expire 1 hour after issue. The background cron
 *   (`sync-all-users`) refreshes tokens as a side-effect of syncing, but if a
 *   user logs in and their last sync was >1 hour ago, the stored token will be
 *   stale. Calling this function on login guarantees a valid token is in the DB
 *   before any sync attempt is made.
 *
 * Response shape (always 200 — never throws at the HTTP level):
 *   { refreshed: true }                         Token was refreshed successfully
 *   { refreshed: false, reason: "no_token" }    User hasn't connected Gmail yet
 *   { refreshed: false, reason: "needs_reauth" } Refresh token is permanently dead;
 *                                                caller should redirect to OAuth flow
 *
 * On `needs_reauth`: the dead token row is deleted from the DB and the response
 * signals to the client (EmailContext) to redirect the user through the Gmail
 * OAuth2 flow again.
 *
 * Auth: caller must supply a valid Supabase JWT.
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

  // No token row means the user hasn't connected Gmail yet — not an error.
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
      // Token is permanently dead. Delete the row so the UI shows "Connect Gmail"
      // on next load, then signal the client to re-initiate OAuth.
      await supabase.from("gmail_tokens").delete().eq("user_id", user.id);
      return json({ refreshed: false, reason: "needs_reauth" }, 200);
    }
    console.error("Token refresh failed for user:", user.id, err);
    return json({ error: "Token refresh failed" }, 500);
  }
});
