/**
 * fetch-attachment — on-demand Gmail attachment download and storage
 *
 * Gmail does not include attachment binaries in message fetch responses.
 * Instead, attachment metadata (ID, filename, MIME type, size) is stored in
 * the DB at sync time, and this function is called when the user explicitly
 * requests a specific file.
 *
 * Flow:
 *   1. Authenticate the caller and load their Gmail token.
 *   2. Fetch the raw binary from Gmail's Attachments API using the stored
 *      `attachment_id` and the parent `message_id`.
 *   3. Decode the URL-safe base64 payload to raw bytes.
 *   4. Upload to Supabase Storage at `{userId}/{messageId}/{filename}`.
 *      Uses `upsert: true` so re-fetching the same attachment is idempotent.
 *   5. Generate and return a 1-hour signed URL for the browser to download.
 *
 * Storage layout:
 *   Bucket:  attachments  (private, RLS restricts each user to their own folder)
 *   Path:    {user_id}/{message_id}/{filename}
 *
 *   Namespacing by `message_id` prevents filename collisions across messages
 *   from the same sender (e.g. multiple "invoice.pdf" attachments).
 *
 * Request body (JSON):
 *   message_id     string  Gmail message ID that owns the attachment
 *   attachment_id  string  Gmail attachment ID (from `emails.attachments[].attachment_id`)
 *   filename       string  Original filename (used as the storage key and download name)
 *   mime_type      string  MIME type for the Content-Type header (optional, defaults to
 *                          application/octet-stream)
 *
 * Response (200):
 *   { url: string, path: string }
 *   `url`  — 1-hour signed download URL, ready for `<a href>` or `window.open`
 *   `path` — storage path (useful for future direct access or deletion)
 *
 * Error responses:
 *   400  Missing required fields
 *   401  Missing or invalid auth token
 *   404  User has no Gmail token (Gmail not connected)
 *   500  Gmail API error, storage upload failure, or signed URL generation failure
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, corsOk } from "../_shared/cors.ts";
import { getAttachment } from "../_shared/gmailApi.ts";
import { getValidAccessToken } from "../_shared/gmailAuth.ts";
import type { GmailTokenRow } from "../_shared/types.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Missing access token" }, 401);

  const body = await req.json().catch(() => ({}));
  const { message_id, attachment_id, filename, mime_type } = body;
  if (!message_id || !attachment_id || !filename) {
    return json({ error: "message_id, attachment_id, and filename are required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("gmail_tokens")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (tokenError || !tokenRow) return json({ error: "Gmail not connected" }, 404);

  try {
    const accessToken = await getValidAccessToken(supabase, tokenRow as GmailTokenRow);
    const { data: base64Data } = await getAttachment(accessToken, message_id, attachment_id);

    // Gmail uses URL-safe base64 (RFC 4648 §5); normalize to standard alphabet
    // before passing to atob(), which only accepts the standard encoding.
    const normalized = base64Data.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const storagePath = `${user.id}/${message_id}/${filename}`;
    const contentType = mime_type ?? "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(storagePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return json({ error: "Failed to store attachment" }, 500);
    }

    // Signed URL expires in 1 hour — long enough for an immediate download,
    // short enough that a leaked URL has minimal exposure.
    const { data: signedData, error: signedError } = await supabase.storage
      .from("attachments")
      .createSignedUrl(storagePath, 3600);

    if (signedError || !signedData) {
      return json({ error: "Failed to generate download URL" }, 500);
    }

    return json({ url: signedData.signedUrl, path: storagePath }, 200);
  } catch (err) {
    console.error("fetch-attachment failed:", err);
    return json({ error: "Failed to fetch attachment" }, 500);
  }
});
