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



// for the fucking love of god remove this
export async function triggerEmailSync(user_id: string) {
  const res = await fetch('/api/fetch-new-emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2aGhvZXBzZnBvdHB1YWVucnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNzg2MjIsImV4cCI6MjA2NzY1NDYyMn0.ZcPybskFVIqag_KzDnQSyS9B-kl6ZbcQonOwPG24LiE`, // if public
    },
    body: JSON.stringify({ user_id }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to trigger sync: ${error}`);
  }

  return res.json();
}
