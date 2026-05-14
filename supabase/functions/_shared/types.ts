/**
 * types.ts — shared type definitions for the Supabase edge function layer
 *
 * These types mirror the `gmail_tokens` table schema and are used across sync,
 * auth, and classification functions. Keep in sync with any migration that
 * alters that table.
 */

/** A row from the `gmail_tokens` table. Holds OAuth2 credentials for one user. */
export interface GmailTokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  /** Unix timestamp (seconds) when the access token expires. Compare against
   *  `Date.now() / 1000` — NOT milliseconds. */
  expires_at: number;
  created_at: string;
  updated_at: string;
  /** ISO timestamp of the last successful inbox sync. Null if the user has
   *  never been synced (e.g. newly connected). Used by `sync-all-users` to
   *  determine how far back to look. */
  last_synced_at: string | null;
}
