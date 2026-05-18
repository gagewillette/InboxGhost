// lib/emails.ts
import { supabase } from "@/app/supabase";
import type { Email, EmailThread } from "@/app/types";

export async function fetchEmails(userId: string): Promise<Email[]> {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  // remove the HTML entities from the raw data and turn back into symbols
  const cleanedData = (data ?? []).map((email) => ({
    ...email,
    snippet: decodeHtmlEntities(email.snippet),
  }));

  return cleanedData;
}

export async function fetchEmailThreads(
  userId: string
): Promise<EmailThread[]> {
  const { data, error } = await supabase
    .from("email_threads")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return data ?? [];
}

function decodeHtmlEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}



export async function triggerEmailSync(accessToken: string, fromDay = 0, toDay = fromDay) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-new-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      from_day: fromDay,
      to_day: toDay,
      local_date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in user's local TZ
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to trigger sync: ${error}`);
  }

  return res.json();
}

export async function refreshGmailToken(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/refresh-gmail-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh Gmail token: ${error}`);
  }

  return res.json();
}

export async function fetchAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string
): Promise<{ url: string; path: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-attachment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message_id: messageId, attachment_id: attachmentId, filename, mime_type: mimeType }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to fetch attachment: ${error}`);
  }

  return res.json();
}

export async function deleteThreads(userId: string, threadIds: string[]): Promise<void> {
  // Delete child rows first to satisfy any FK constraints.
  await supabase.from("emails").delete().eq("user_id", userId).in("thread_id", threadIds);
  const { error } = await supabase
    .from("email_threads")
    .delete()
    .eq("user_id", userId)
    .in("thread_id", threadIds);
  if (error) throw new Error(error.message);
}

export async function classifyEmail(
  accessToken: string,
  payload: {
    thread_id: string;
    subject: string;
    body?: string;
    from_email?: string;
    user_labels: Array<{ name: string; description?: string }>;
  }
): Promise<{ importance: "high" | "med" | "low"; labels: string[] }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/classify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Classification failed: ${error}`);
  }
  return res.json();
}

export async function deleteAllEmails(accessToken: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/delete-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to delete emails: ${error}`);
  }

  return res.json();
}
