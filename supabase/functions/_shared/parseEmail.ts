/**
 * parseEmail.ts — transforms a raw Gmail API message object into a flat DB row
 *
 * Gmail represents message content as a recursive MIME tree. The structure
 * varies by email type:
 *
 *   Plain-text email:    payload.body.data  (no `parts` array)
 *   HTML email:          payload.parts[0].body.data  (single part, text/html)
 *   Multipart/alternative:  payload.parts → [text/plain, text/html]
 *   Multipart/mixed:    payload.parts → [multipart/alternative, attachment, ...]
 *
 * This module flattens all of those into a single `body` string and a flat
 * `attachments` array, so the rest of the app never needs to know about MIME.
 *
 * Encoding note: Gmail encodes body data as URL-safe base64 (RFC 4648 §5),
 * which substitutes `-` for `+` and `_` for `/`. Standard `atob()` requires
 * the canonical alphabet, so normalization is required before decoding.
 */

/** Decode a URL-safe base64 string (Gmail's encoding) to a UTF-8 string. */
function decodeBase64(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Recursively search a MIME part tree for the first leaf that matches a given
 * MIME type and has inline body data.
 *
 * Attachments are excluded because they use `body.attachmentId` instead of
 * `body.data`; they are collected separately by `collectAttachments`.
 */
// deno-lint-ignore no-explicit-any
function findPart(parts: any[], mimeType: string): any {
  for (const part of parts) {
    if (part.mimeType === mimeType && part.body?.data) return part;
    if (part.parts) {
      const found = findPart(part.parts, mimeType);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Extract the readable body from a Gmail message payload.
 *
 * Priority order (highest to lowest):
 *   1. text/plain  — preferred for AI classification and plain display
 *   2. text/html   — used when no plain-text alternative exists; the UI renders
 *                    it in a sandboxed iframe via `HtmlEmailFrame`
 *   3. Any part with inline data — last resort for unusual MIME structures
 *   4. Top-level `payload.body.data` — single-part (non-multipart) messages
 */
// deno-lint-ignore no-explicit-any
function getBody(payload: any): string {
  if (!payload) return "";
  if (payload.parts) {
    // Prefer plain text; fall back to HTML; last resort any part with data.
    const plain = findPart(payload.parts, "text/plain");
    if (plain) return decodeBase64(plain.body.data);
    const html = findPart(payload.parts, "text/html");
    if (html) return decodeBase64(html.body.data);
    const any = payload.parts.find((p: any) => p.body?.data);
    if (any) return decodeBase64(any.body.data);
  }
  if (payload.body?.data) return decodeBase64(payload.body.data);
  return "";
}

/** Build a case-insensitive map of header name → value for fast lookup. */
function headerMap(headers: { name: string; value: string }[]) {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    map[h.name.toLowerCase()] = h.value;
  });
  return map;
}

/** Extract the bare email address from an RFC 5322 address string.
 *  "John Doe <john@example.com>" → "john@example.com" */
function extractEmail(addr: string | undefined) {
  if (!addr) return "";
  const match = addr.match(/<(.+?)>/);
  return match ? match[1] : addr;
}

/**
 * Extract the display name from an RFC 5322 address string.
 * Falls back to the bare email address if no display name is present.
 * "John Doe <john@example.com>" → "John Doe"
 * "john@example.com"           → "john@example.com"
 */
function extractSender(addr: string | undefined) {
  if (!addr) return "";
  const nameMatch = addr.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) return nameMatch[1].trim();
  return extractEmail(addr);
}

/** Metadata stored per attachment. The full binary is not stored at sync time —
 *  it is fetched on demand via the `fetch-attachment` edge function. */
export interface EmailAttachment {
  /** Gmail's stable reference ID for fetching the binary via the Attachments API. */
  attachment_id: string;
  filename: string;
  mime_type: string;
  /** Size in bytes as reported by Gmail (approximate for encoded content). */
  size: number;
}

/** Flat representation of a Gmail message ready for upsertion into `emails`. */
export interface ParsedEmail {
  user_id: string;
  thread_id: string;
  message_id: string;
  /** Bare email address of the sender (e.g. "sender@example.com"). */
  from_email: string;
  /** Display name or email address for rendering in the UI thread list. */
  sender: string;
  to_emails: string[];
  subject: string;
  /** Gmail-generated 180-char plain-text snippet, used as a preview line. */
  snippet: string;
  /** Decoded body text (plain or HTML depending on what's available). */
  body: string;
  /** Millisecond epoch timestamp from Gmail's `internalDate` field. */
  internal_date: number;
  is_incoming: boolean;
  is_processed: boolean;
  /** Attachment metadata collected from the MIME tree. Empty if no attachments. */
  attachments: EmailAttachment[];
}

/**
 * Recursively collect attachment metadata from a MIME part tree.
 *
 * A part is an attachment when `body.attachmentId` is present. Gmail sets this
 * on any part that requires a separate API call to download — inline images with
 * a Content-ID are typically inlined in the body instead and won't appear here.
 */
// deno-lint-ignore no-explicit-any
function collectAttachments(parts: any[]): EmailAttachment[] {
  const results: EmailAttachment[] = [];
  for (const part of parts) {
    const attachmentId = part.body?.attachmentId;
    if (attachmentId && part.filename) {
      results.push({
        attachment_id: attachmentId,
        filename: part.filename,
        mime_type: part.mimeType ?? "application/octet-stream",
        size: part.body?.size ?? 0,
      });
    }
    if (part.parts) results.push(...collectAttachments(part.parts));
  }
  return results;
}

/**
 * Parse a raw Gmail API message object into a `ParsedEmail` ready for the DB.
 *
 * @param userId  The Supabase auth user ID to associate the row with.
 * @param msg     A full Gmail message object (`format=full`).
 */
// deno-lint-ignore no-explicit-any
export default function parseEmail(userId: string, msg: any): ParsedEmail {
  const headers = headerMap(msg.payload.headers || []);
  const toField = headers["to"] || "";
  const toEmails = toField
    .split(",")
    .map((e: string) => extractEmail(e.trim()))
    .filter(Boolean);
  const fromEmail = extractEmail(headers["from"]);
  const sender = extractSender(headers["from"]);
  const attachments = msg.payload.parts
    ? collectAttachments(msg.payload.parts)
    : [];

  return {
    user_id: userId,
    thread_id: msg.threadId,
    message_id: msg.id,
    from_email: fromEmail,
    sender,
    to_emails: toEmails,
    subject: headers["subject"] || "",
    snippet: msg.snippet || "",
    body: getBody(msg.payload),
    internal_date: parseInt(msg.internalDate, 10) || Date.now(),
    is_incoming: true,
    is_processed: true,
    attachments,
  };
}
