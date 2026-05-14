export interface GmailTokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  /** Unix timestamp (seconds) when the access token expires. */
  expires_at: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}
