function decodeBase64(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Recursively find the first part matching a MIME type in nested multipart trees.
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

function headerMap(headers: { name: string; value: string }[]) {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    map[h.name.toLowerCase()] = h.value;
  });
  return map;
}

function extractEmail(addr: string | undefined) {
  if (!addr) return "";
  const match = addr.match(/<(.+?)>/);
  return match ? match[1] : addr;
}

// Returns the display name if present ("John Doe <j@x.com>" → "John Doe"),
// otherwise falls back to the bare email address.
function extractSender(addr: string | undefined) {
  if (!addr) return "";
  const nameMatch = addr.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) return nameMatch[1].trim();
  return extractEmail(addr);
}

export interface ParsedEmail {
  user_id: string;
  thread_id: string;
  message_id: string;
  from_email: string;
  sender: string;
  to_emails: string[];
  subject: string;
  snippet: string;
  body: string;
  internal_date: number;
  is_incoming: boolean;
  is_processed: boolean;
}

export default function parseEmail(userId: string, msg: any): ParsedEmail {
  const headers = headerMap(msg.payload.headers || []);
  const toField = headers["to"] || "";
  const toEmails = toField
    .split(",")
    .map((e: string) => extractEmail(e.trim()))
    .filter(Boolean);
  const fromEmail = extractEmail(headers["from"]);
  const sender = extractSender(headers["from"]);

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
  };
}
