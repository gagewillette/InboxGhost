/**
 * delete-emails — wipe all stored emails and threads for the authenticated user
 *
 * Deletes all rows owned by the caller from both `emails` and `email_threads`.
 * Used by the dashboard "Nuke DB" button as a development/debugging tool to
 * reset local state and force a clean re-sync.
 *
 * Both tables are cleared in sequence. If either delete fails, the error
 * message is returned so the caller can surface it. Note that a partial failure
 * (emails deleted, threads not) is possible — the client should refresh state
 * regardless to avoid stale UI.
 *
 * This function does NOT delete Supabase Storage attachments — those are
 * keyed by user_id and are unaffected by a DB nuke.
 *
 * Auth: caller must supply a valid Supabase JWT. Rows are scoped to the
 * authenticated user only — no cross-user data is accessible.
 *
 * Response (200):
 *   { message: "Emails and threads deleted successfully." }
 *
 * Error responses:
 *   401  Missing or invalid auth token
 *   500  DB delete error
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, corsOk } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Missing auth token" }, 401);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const { error: emailErr } = await supabase
    .from("emails")
    .delete()
    .eq("user_id", user.id);

  const { error: threadErr } = await supabase
    .from("email_threads")
    .delete()
    .eq("user_id", user.id);

  if (emailErr || threadErr) {
    return json({ error: emailErr?.message ?? threadErr?.message }, 500);
  }

  return json({ message: "Emails and threads deleted successfully." }, 200);
});
