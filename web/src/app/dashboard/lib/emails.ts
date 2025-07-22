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
