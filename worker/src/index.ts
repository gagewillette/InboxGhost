import cron from "node-cron";
import supabase from "./lib/supabase";
import {
  listRecentThreads,
  getThread,
  getMessage,
  refreshAccessToken,
} from "./lib/gmail";
import parseEmail from "./lib/parseEmail";
import { GmailTokenRow } from "./types";

async function updateToken(
  userId: string,
  refreshToken: string,
  accessToken: string,
  expiresIn: number
) {
  const expires_at = Math.floor(Date.now() / 1000) + expiresIn;
  await supabase
    .from("gmail_tokens")
    .update({ access_token: accessToken, expires_at })
    .eq("user_id", userId);
}

async function fetchAccessToken(tokenRow: GmailTokenRow) {
  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at * 1000 <= Date.now()) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    if (!refreshed) return null;
    accessToken = refreshed.access_token;
    await updateToken(
      tokenRow.user_id,
      tokenRow.refresh_token,
      refreshed.access_token,
      refreshed.expires_in
    );
  }
  return accessToken;
}

export async function syncUser(tokenRow: GmailTokenRow) {
  const accessToken = await fetchAccessToken(tokenRow);
  if (!accessToken) {
    console.error("Access token invalid in syncUser func, exiting");
    return;
  }

  const threadsRes = await listRecentThreads(accessToken);

  const threads = threadsRes.threads || [];

  for (const thread of threads) {
    const threadData = await getThread(accessToken, thread.id);
    for (const msg of threadData.messages) {
      const fullMsg = await getMessage(accessToken, msg.id);
      const email = parseEmail(tokenRow.user_id, fullMsg);

      const res = await supabase
        .from("emails")
        .upsert(email, { onConflict: "user_id,message_id" });

      console.log('synced email with id: ', email.message_id, " into user id: ", tokenRow.user_id);

      await supabase.from("email_threads").upsert(
        {
          user_id: tokenRow.user_id,
          thread_id: email.thread_id,
          subject: email.subject,
          last_message_at: new Date(email.internal_date),
        },
        { onConflict: "user_id,thread_id" }
      );

      await supabase
        .from("gmail_tokens")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("user_id", tokenRow.user_id);
    }
  }
}

export async function syncAllUsers() {
  const { data, error } = await supabase.from("gmail_tokens").select("*");
  if (error) {
    console.error("Failed to fetch users", error);
    return;
  }
  for (const row of data) {
    try {
      await syncUser(row);
    } catch (err) {
      console.error("Error syncing user", row.user_id, err);
    }
  }
}




// 20 minute cron to sync every users email into the db
cron.schedule("*/30 * * * *", () => {
  console.log("Running sync at", new Date().toISOString());
  syncAllUsers().catch((err) => console.error(err));
});

// run immediately on load

// TODO: uncomment this out when building for prod. having this run on every single deployment is making so many extraneous requests
// syncAllUsers().catch((err) => console.error(err));
