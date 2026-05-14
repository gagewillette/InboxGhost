import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { listThreadsForDay, listThreadsSince, getThread, getMessage } from "./gmailApi.ts";
import { getValidAccessToken, TokenRevokedError } from "./gmailAuth.ts";
import { GmailTokenRow } from "./types.ts";
import parseEmail from "./parseEmail.ts";

export type { GmailTokenRow } from "./types.ts";

async function upsertThreadMessages(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  threads: { id: string }[]
): Promise<void> {
  for (const thread of threads) {
    const threadData = await getThread(accessToken, thread.id);
    for (const msg of threadData.messages) {
      const fullMsg = await getMessage(accessToken, msg.id);
      const { sender, ...emailRow } = parseEmail(userId, fullMsg);

      await supabase
        .from("emails")
        .upsert(emailRow, { onConflict: "user_id,message_id" });

      await supabase.from("email_threads").upsert(
        {
          user_id: userId,
          thread_id: emailRow.thread_id,
          subject: emailRow.subject,
          sender,
          last_message_at: new Date(emailRow.internal_date),
        },
        { onConflict: "user_id,thread_id" }
      );
    }
  }

  await supabase
    .from("gmail_tokens")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/**
 * Syncs one day's inbox threads for a user. daysBack=0 → today, 1 → yesterday.
 * Called by the `fetch-new-emails` function on user-initiated syncs.
 */
export async function syncUser(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  daysBack = 0
): Promise<void> {
  const accessToken = await getValidAccessToken(supabase, tokenRow);
  const { threads = [] } = await listThreadsForDay(accessToken, daysBack);
  await upsertThreadMessages(supabase, tokenRow.user_id, accessToken, threads);
}

/**
 * Syncs all inbox threads since sinceEpochSeconds for a user.
 * Called by the `sync-all-users` cron function.
 */
export async function syncUserSince(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow,
  sinceEpochSeconds: number
): Promise<void> {
  const accessToken = await getValidAccessToken(supabase, tokenRow);
  const { threads = [] } = await listThreadsSince(accessToken, sinceEpochSeconds);
  await upsertThreadMessages(supabase, tokenRow.user_id, accessToken, threads);
}

export { TokenRevokedError };
