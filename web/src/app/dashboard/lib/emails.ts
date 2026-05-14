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



export async function triggerEmailSync(accessToken: string, daysBack = 0) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const res = await fetch(`${supabaseUrl}/functions/v1/fetch-new-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ days_back: daysBack }),
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
