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
