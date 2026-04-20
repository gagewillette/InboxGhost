function decodeBase64(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function getBody(payload: any): string {
  if (!payload) return "";
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    const partWithData = payload.parts.find((p: any) => p.body?.data);
    if (partWithData) return decodeBase64(partWithData.body.data);
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

export interface ParsedEmail {
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

export default function parseEmail(userId: string, msg: any): ParsedEmail {
  const headers = headerMap(msg.payload.headers || []);
  const toField = headers["to"] || "";
  const toEmails = toField
    .split(",")
    .map((e: string) => extractEmail(e.trim()))
    .filter(Boolean);
  const fromEmail = extractEmail(headers["from"]);

  return {
    user_id: userId,
    thread_id: msg.threadId,
    message_id: msg.id,
    from_email: fromEmail,
    to_emails: toEmails,
    subject: headers["subject"] || "",
    snippet: msg.snippet || "",
    body: getBody(msg.payload),
    internal_date: parseInt(msg.internalDate, 10) || Date.now(),
    is_incoming: true,
    is_processed: true,
  };
}
