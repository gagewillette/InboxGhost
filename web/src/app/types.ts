export interface EmailAttachment {
  attachment_id: string;
  filename: string;
  mime_type: string;
  size: number;
}

export interface Email {
  user_id: string;
  thread_id: string;
  message_id: string;
  from_email: string;
  to_emails: string[];
  subject: string;
  snippet: string;
  body: string;
  content_type: string;
  internal_date: number;
  is_incoming: boolean;
  is_processed: boolean;
  attachments: EmailAttachment[];
}

export interface EmailThread {
  user_id: string;
  thread_id: string;
  subject: string;
  sender: string;
  last_message_at: string; // ISO string
  importance?: "high" | "med" | "low";
  labels?: string[];
  attachments: EmailAttachment[];
}

export type ImportanceFilter = "all" | "high" | "med" | "low";

export interface UserLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}
