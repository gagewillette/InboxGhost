import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  listRecentThreads,
  getThread,
  getMessage,
  refreshAccessToken,
} from "./gmail.ts";
import parseEmail from "./parseEmail.ts";

export interface GmailTokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

async function fetchAccessToken(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow
): Promise<string | null> {
  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at * 1000 <= Date.now()) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (!refreshed) return null;
    accessToken = refreshed.access_token;
    const expires_at = Math.floor(Date.now() / 1000) + refreshed.expires_in;
    await supabase
      .from("gmail_tokens")
      .update({ access_token: accessToken, expires_at })
      .eq("user_id", tokenRow.user_id);
  }
  return accessToken;
}

export async function syncUser(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow
) {
  const accessToken = await fetchAccessToken(supabase, tokenRow);
  if (!accessToken) {
    console.error("Access token invalid for user:", tokenRow.user_id);
    return;
  }

  const threadsRes = await listRecentThreads(accessToken);
  const threads = threadsRes.threads || [];

  for (const thread of threads) {
    const threadData = await getThread(accessToken, thread.id);
    for (const msg of threadData.messages) {
      const fullMsg = await getMessage(accessToken, msg.id);
      const email = parseEmail(tokenRow.user_id, fullMsg);

      await supabase
        .from("emails")
        .upsert(email, { onConflict: "user_id,message_id" });

      await supabase.from("email_threads").upsert(
        {
          user_id: tokenRow.user_id,
          thread_id: email.thread_id,
          subject: email.subject,
          last_message_at: new Date(email.internal_date),
        },
        { onConflict: "user_id,thread_id" }
      );
    }
  }

  await supabase
    .from("gmail_tokens")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", tokenRow.user_id);
}
