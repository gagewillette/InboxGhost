const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1";

export async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.append("client_id", Deno.env.get("GOOGLE_CLIENT_ID")!);
  params.append("client_secret", Deno.env.get("GOOGLE_CLIENT_SECRET")!);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    console.error("Failed to refresh token:", await res.text());
    return null;
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

async function gmailRequest<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Format a Date as YYYY/MM/DD for Gmail search queries
function toGmailDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

// daysBack=0 → today, daysBack=1 → yesterday, etc.
export function listThreadsForDay(accessToken: string, daysBack: number) {
  const after = new Date();
  after.setDate(after.getDate() - daysBack);       // start of target day
  const before = new Date();
  before.setDate(before.getDate() - daysBack + 1); // start of day after target

  const q = encodeURIComponent(
    `in:inbox -category:social -category:promotions after:${toGmailDate(after)} before:${toGmailDate(before)}`
  );

  return gmailRequest<{ threads?: { id: string }[] }>(
    accessToken,
    `/users/me/threads?maxResults=100&q=${q}`
  );
}

// Fetch threads received after a specific Unix timestamp (seconds).
// More precise than day-based queries — used by the background cron sync.
export function listThreadsSince(accessToken: string, sinceEpochSeconds: number) {
  const q = encodeURIComponent(
    `in:inbox -category:social -category:promotions after:${sinceEpochSeconds}`
  );

  return gmailRequest<{ threads?: { id: string }[] }>(
    accessToken,
    `/users/me/threads?maxResults=100&q=${q}`
  );
}

export function getThread(accessToken: string, threadId: string) {
  return gmailRequest<{ messages: { id: string }[] }>(
    accessToken,
    `/users/me/threads/${threadId}?format=metadata`
  );
}

export function getMessage(accessToken: string, messageId: string) {
  return gmailRequest<any>(
    accessToken,
    `/users/me/messages/${messageId}?format=full`
  );
}
