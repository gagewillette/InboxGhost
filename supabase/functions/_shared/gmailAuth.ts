/**
 * gmailAuth.ts — OAuth2 token lifecycle management for Gmail
 *
 * Google OAuth2 access tokens expire after 1 hour. This module handles
 * refreshing them transparently so callers never have to deal with expiry
 * directly. The refresh token is long-lived but can be permanently invalidated
 * in two scenarios:
 *
 *  1. The app is in "testing" mode on Google Cloud Console and the 7-day
 *     session limit has been hit. The user must re-authorize.
 *  2. The user explicitly revoked InboxGhost's access via their Google account
 *     security settings.
 *
 * Both cases surface as `invalid_grant` from Google and are re-thrown as
 * `TokenRevokedError`. Callers that catch this error should delete the token
 * row and redirect the user back through the OAuth2 flow.
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { GmailTokenRow } from "./types.ts";

/** Thrown when a refresh token is permanently invalid and the user must re-auth. */
export class TokenRevokedError extends Error {
  constructor() {
    super("Gmail authorization has expired. User must re-connect Gmail.");
    this.name = "TokenRevokedError";
  }
}

/**
 * Exchange a refresh token for a new short-lived access token via Google OAuth2.
 *
 * Reads `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from environment.
 *
 * @throws TokenRevokedError  if Google returns `invalid_grant` (permanently dead)
 * @throws Error              for any other non-200 response from Google
 */
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

/**
 * Write a newly issued access token and its expiry back to `gmail_tokens`.
 *
 * `expires_at` is stored as a Unix timestamp in seconds so it can be compared
 * directly against `Date.now() / 1000` without unit conversion.
 */
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
 * Return a guaranteed-valid access token for the given token row.
 *
 * If the stored token is still within its expiry window it is returned as-is,
 * saving an unnecessary round-trip to Google. Otherwise the token is refreshed
 * and the new value is persisted before being returned.
 *
 * If the grant is permanently revoked, the token row is deleted from the DB
 * (so the UI correctly shows the "Connect Gmail" prompt next visit) and
 * `TokenRevokedError` is re-thrown for the caller to handle.
 *
 * @throws TokenRevokedError  if the refresh token is permanently invalid
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  tokenRow: GmailTokenRow
): Promise<string> {
  // `expires_at` is in seconds; `Date.now()` is in milliseconds.
  if (tokenRow.expires_at * 1000 > Date.now()) {
    return tokenRow.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    await persistToken(supabase, tokenRow.user_id, refreshed.access_token, refreshed.expires_in);
    return refreshed.access_token;
  } catch (err) {
    if (err instanceof TokenRevokedError) {
      // Remove the dead row so the next session shows "Connect Gmail" instead
      // of silently failing on every sync attempt.
      await supabase.from("gmail_tokens").delete().eq("user_id", tokenRow.user_id);
    }
    throw err;
  }
}
