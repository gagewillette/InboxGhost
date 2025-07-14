// structure of the gmail_token table found in supabase
export interface GmailTokenRow {
  user_id: string            // UUID
  access_token: string
  refresh_token: string
  expires_at: number         // Unix timestamp (in seconds or ms depending on API usage)
  created_at: string         // ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
  updated_at: string         // ISO 8601 format
  last_synced_at: string | null  // Nullable timestamp
}
