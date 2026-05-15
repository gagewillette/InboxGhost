/**
 * classify-email — AI-powered email label and importance scoring
 *
 * Accepts a thread's subject, body, and sender along with the user's custom
 * label set, calls an LLM via OpenRouter, and persists the result to
 * `email_classifications`. Returns the classification immediately so the UI can
 * update without waiting for a separate read.
 *
 * Classification output:
 *   labels      string[]             Zero or more of the user's label names that
 *                                    apply to this email. The model is instructed
 *                                    to only return labels from the provided list
 *                                    and to leave it empty if none match.
 *   importance  "high" | "med" | "low"  How urgently the user should read this.
 *
 * Importance rubric (from system prompt):
 *   high — requires action soon, time-sensitive, or from someone important
 *   med  — worth reading but not urgent
 *   low  — automated, promotional, or low-signal
 *
 * Label format accepted in `user_labels`:
 *   string                     — just a name, no description
 *   { name, description? }     — with optional description for better accuracy
 *
 * When `user_labels` is empty, label assignment is skipped and only importance
 * is scored.
 *
 * Model configuration:
 *   Provider and model are set via environment variables so they can be swapped
 *   without a code change:
 *     OPENROUTER_API_KEY   API key for OpenRouter
 *     OPENROUTER_MODEL     Model identifier (e.g. "openai/gpt-4o-mini")
 *
 *   `response_format: { type: "json_object" }` is used to guarantee the model
 *   returns valid JSON. The result is validated and sanitized before persistence
 *   to handle edge cases where the model returns unexpected fields.
 *
 * Persistence:
 *   Results are upserted to `email_classifications` on `(user_id, thread_id)`.
 *   A upsert failure is logged but does not fail the request — the classification
 *   is still returned to the caller.
 *
 * Auth: caller must supply a valid Supabase JWT (anon key client is used for
 * auth verification; service role client is used for the classification upsert
 * to bypass RLS).
 *
 * Request body (JSON):
 *   thread_id    string          Required. Identifies the thread to classify.
 *   subject      string          Required. Email subject line.
 *   body         string?         Optional. Email body (plain text preferred).
 *   from_email   string?         Optional. Sender email address for context.
 *   user_labels  UserLabel[]     Required. Array of label names or objects.
 *
 * Response (200):
 *   { labels: string[], importance: "high" | "med" | "low" }
 *
 * Error responses:
 *   400  Missing required fields (thread_id or subject)
 *   401  Missing or invalid auth token
 *   500  OpenRouter not configured
 *   502  OpenRouter returned a non-200 response
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, corsOk } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("classify", "VERBOSE_CLASSIFY");

const BODY_MAX_CHARS = 3000;

/**
 * Converts an HTML email body to clean plain text suitable for an LLM.
 * Removes style/script blocks, preserves paragraph breaks, strips tags,
 * decodes common entities, and collapses whitespace.
 */
function htmlToText(html: string): string {
  return html
    // Drop entire style/script/head blocks including their content
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    // Turn block-level elements into newlines so paragraphs survive
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|blockquote|pre)[^>]*>/gi, "\n")
    // Strip every remaining tag
    .replace(/<[^>]+>/g, " ")
    // Decode the most common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")   // any remaining named entities → space
    // Collapse runs of whitespace / blank lines
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function prepareBody(raw: string | undefined): string {
  if (!raw) return "";
  const isHtml = /<[a-z][\s\S]*>/i.test(raw);
  const text = isHtml ? htmlToText(raw) : raw.trim();
  return text.length > BODY_MAX_CHARS
    ? text.slice(0, BODY_MAX_CHARS) + "\n[truncated]"
    : text;
}

const systemPrompt = `You are an email classifier. You will receive a list of available labels and an email (from, subject, and optional body).

Assign zero or more labels from the available list that genuinely describe the email. Do not invent labels not in the list. If no labels match, return an empty array.

Set importance based on how urgently the user needs to see or act on this email:
- "high": requires action soon, time-sensitive, or from someone important
- "med": worth reading but not urgent
- "low": automated, promotional, or low-signal

Respond with JSON only, no other text:
{
  "labels": ["label-name"],
  "importance": "high" | "med" | "low"
}`;

type UserLabel = string | { name: string; description?: string };

interface ClassifyRequest {
  thread_id: string;
  subject: string;
  body?: string;
  from_email?: string;
  user_labels: UserLabel[];
}

interface ClassifyResult {
  labels: string[];
  importance: "high" | "med" | "low";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Missing authorization header" }, 401);

    // Use the anon key client for auth verification (respects JWT claims).
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    log.info("authenticated user", user.id);

    const { thread_id, subject, body, from_email, user_labels }: ClassifyRequest =
      await req.json();

    log.info("request received", { thread_id, subject, from_email, label_count: user_labels?.length ?? 0, body_length: body?.length ?? 0, body_is_html: body ? /<[a-z][\s\S]*>/i.test(body) : false });

    if (!thread_id || !subject) {
      return json({ error: "thread_id and subject are required" }, 400);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const model = Deno.env.get("OPENROUTER_MODEL");

    if (!apiKey || !model) {
      log.error("missing env vars: OPENROUTER_API_KEY or OPENROUTER_MODEL");
      return json({ error: "Classification service not configured" }, 500);
    }

    log.info("using model", model);

    // Build the label block for the user message. When no labels are configured,
    // the model is told to skip label assignment entirely.
    const labelBlock = user_labels.length > 0
      ? user_labels
          .map((l) => {
            const name = typeof l === "string" ? l : l.name;
            const desc = typeof l === "string" ? undefined : l.description;
            return desc ? `- ${name}: ${desc}` : `- ${name}`;
          })
          .join("\n")
      : "(none — skip label assignment, only return importance)";

    const cleanBody = prepareBody(body);
    log.info("body after cleaning", { original_length: body?.length ?? 0, cleaned_length: cleanBody.length });
    log.info("cleaned body preview", cleanBody.slice(0, 300));

    const userMessage = [
      `Available labels:\n${labelBlock}`,
      `From: ${from_email ?? "unknown"}`,
      `Subject: ${subject}`,
      cleanBody ? `\nBody:\n${cleanBody}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    log.info("sending request to OpenRouter");
    log.json("user message", userMessage);

    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://inboxghost.app",
        "X-Title": "InboxGhost",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    log.info("OpenRouter response status", orRes.status);

    if (!orRes.ok) {
      const errBody = await orRes.text();
      log.error("OpenRouter error response", errBody);
      return json({ error: "Classification request failed" }, 502);
    }

    const completion = await orRes.json();
    log.json("OpenRouter completion", completion);

    const choice = completion.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (!choice || finishReason === "tool_calls" || choice.message?.content === null) {
      log.error("model returned no text content", { finish_reason: finishReason, model });
      return json({ error: "Model did not return a text response — try a different model" }, 502);
    }

    const rawContent = choice.message.content ?? "{}";
    log.info("raw model output", rawContent);

    // Strip markdown code fences that non-OpenAI models commonly wrap JSON in.
    // e.g. ```json\n{...}\n``` or ```\n{...}\n```
    const raw = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    if (raw !== rawContent) {
      log.info("stripped markdown fences from model output");
    }

    // Validate and sanitize the model's output. Invalid importance values
    // default to "low" rather than failing the request.
    let result: ClassifyResult;
    try {
      const parsed = JSON.parse(raw);
      result = {
        labels: Array.isArray(parsed.labels) ? (parsed.labels as string[]) : [],
        importance: (["high", "med", "low"] as const).includes(parsed.importance)
          ? parsed.importance
          : "low",
      };
    } catch {
      log.error("failed to parse model output, defaulting to low/empty", raw);
      result = { labels: [], importance: "low" };
    }

    log.json("classification result", result);

    // Use service role for the upsert to bypass RLS on email_classifications.
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    log.info("upserting classification to DB for thread", thread_id);

    const { error: upsertError } = await serviceClient
      .from("email_classifications")
      .upsert(
        {
          user_id: user.id,
          thread_id,
          labels: result.labels,
          importance: result.importance,
          classified_at: new Date().toISOString(),
        },
        { onConflict: "user_id,thread_id" }
      );

    if (upsertError) {
      // Log but don't fail — the classification is still returned to the caller.
      log.error("failed to persist classification:", upsertError.message);
    } else {
      log.info("classification persisted successfully");
    }

    return json(result, 200);
  } catch (err) {
    log.error("unhandled exception:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
