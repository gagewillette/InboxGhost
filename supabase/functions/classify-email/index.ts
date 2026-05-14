import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, corsOk } from "../_shared/cors.ts";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { thread_id, subject, body, from_email, user_labels }: ClassifyRequest =
      await req.json();

    if (!thread_id || !subject) {
      return json({ error: "thread_id and subject are required" }, 400);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    const model = Deno.env.get("OPENROUTER_MODEL");

    if (!apiKey || !model) {
      console.error("Missing env vars: OPENROUTER_API_KEY or OPENROUTER_MODEL");
      return json({ error: "Classification service not configured" }, 500);
    }

    const labelBlock = user_labels.length > 0
      ? user_labels
          .map((l) => {
            const name = typeof l === "string" ? l : l.name;
            const desc = typeof l === "string" ? undefined : l.description;
            return desc ? `- ${name}: ${desc}` : `- ${name}`;
          })
          .join("\n")
      : "(none — skip label assignment, only return importance)";

    const userMessage = [
      `Available labels:\n${labelBlock}`,
      `From: ${from_email ?? "unknown"}`,
      `Subject: ${subject}`,
      body ? `\n${body}` : "",
    ]
      .filter(Boolean)
      .join("\n");

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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!orRes.ok) {
      console.error("OpenRouter error:", await orRes.text());
      return json({ error: "Classification request failed" }, 502);
    }

    const completion = await orRes.json();
    const raw = completion.choices?.[0]?.message?.content ?? "{}";

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
      result = { labels: [], importance: "low" };
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      console.error("Failed to persist classification:", upsertError.message);
    }

    return json(result, 200);
  } catch (err) {
    console.error("classify-email error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
