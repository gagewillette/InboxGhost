const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1";

async function gmailRequest<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function toGmailDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

/** Fetch inbox threads for a calendar day. daysBack=0 → today, 1 → yesterday. */
export function listThreadsForDay(
  accessToken: string,
  daysBack: number
): Promise<{ threads?: { id: string }[] }> {
  const after = new Date();
  after.setDate(after.getDate() - daysBack);
  const before = new Date();
  before.setDate(before.getDate() - daysBack + 1);

  const q = encodeURIComponent(
    `in:inbox -category:social -category:promotions after:${toGmailDate(after)} before:${toGmailDate(before)}`
  );

  return gmailRequest(accessToken, `/users/me/threads?maxResults=100&q=${q}`);
}

/** Fetch inbox threads received after a Unix timestamp (seconds). */
export function listThreadsSince(
  accessToken: string,
  sinceEpochSeconds: number
): Promise<{ threads?: { id: string }[] }> {
  const q = encodeURIComponent(
    `in:inbox -category:social -category:promotions after:${sinceEpochSeconds}`
  );

  return gmailRequest(accessToken, `/users/me/threads?maxResults=100&q=${q}`);
}

export function getThread(
  accessToken: string,
  threadId: string
): Promise<{ messages: { id: string }[] }> {
  return gmailRequest(accessToken, `/users/me/threads/${threadId}?format=metadata`);
}

// deno-lint-ignore no-explicit-any
export function getMessage(accessToken: string, messageId: string): Promise<any> {
  return gmailRequest(accessToken, `/users/me/messages/${messageId}?format=full`);
}
