import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { GmailTokenRow } from "./types.ts";

export class TokenRevokedError extends Error {
  constructor() {
    super("Gmail authorization has expired. User must re-connect Gmail.");
    this.name = "TokenRevokedError";
  }
}

/** Exchange a refresh token for a new access token via Google OAuth2.
 * Throws TokenRevokedError if the grant is permanently invalid (e.g. 7-day
 * testing mode expiry or user revoked access). */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "invalid_grant") {
      throw new TokenRevokedError();
    }
    throw new Error(`Token refresh failed: ${body.error ?? res.status}`);
  }

  return res.json();
}

/** Persist a new access token and its expiry to `gmail_tokens`. */
export async function persistToken(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  expiresIn: number
): Promise<void> {
  const expires_at = Math.floor(Date.now() / 1000) + expiresIn;
  await supabase
    .from("gmail_tokens")
    .update({ access_token: accessToken, expires_at })
    .eq("user_id", userId);
}

/**
 * Returns a valid access token for the given token row. Refreshes via OAuth2
 * and persists the new token if the current one is expired.
 * Throws TokenRevokedError if the grant is permanently invalid — callers
 * should delete the token row and prompt the user to re-connect Gmail.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow
): Promise<string> {
  if (tokenRow.expires_at * 1000 > Date.now()) {
    return tokenRow.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    await persistToken(supabase, tokenRow.user_id, refreshed.access_token, refreshed.expires_in);
    return refreshed.access_token;
  } catch (err) {
    if (err instanceof TokenRevokedError) {
      // Grant is permanently dead — remove it so the user gets prompted to re-auth.
      await supabase.from("gmail_tokens").delete().eq("user_id", tokenRow.user_id);
    }
    throw err;
  }
}
