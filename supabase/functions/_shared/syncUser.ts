import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  listThreadsForDay,
  listThreadsSince,
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

// daysBack=0 fetches today, 1 fetches yesterday, etc.
export async function syncUser(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  daysBack = 0
) {
  const accessToken = await fetchAccessToken(supabase, tokenRow);
  if (!accessToken) {
    console.error("Access token invalid for user:", tokenRow.user_id);
    return;
  }

  const threadsRes = await listThreadsForDay(accessToken, daysBack);
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
          sender: email.sender,
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

// Used by the background cron: syncs all threads received after sinceEpochSeconds.
// Avoids calendar-day boundaries so a 1AM cron doesn't miss the previous 23 hours.
export async function syncUserSince(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  sinceEpochSeconds: number
) {
  const accessToken = await fetchAccessToken(supabase, tokenRow);
  if (!accessToken) {
    console.error("Access token invalid for user:", tokenRow.user_id);
    return;
  }

  const threadsRes = await listThreadsSince(accessToken, sinceEpochSeconds);
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
          sender: email.sender,
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
