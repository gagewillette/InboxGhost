export interface Email {
  user_id: string;
  thread_id: string;
  message_id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  snippet: string;
  body: string;
  internal_date: number;
  is_incoming: boolean;
  is_processed: boolean;
}

export interface EmailThread {
  user_id: string;
  thread_id: string;
  subject: string;
  last_message_at: string; // ISO string
}
