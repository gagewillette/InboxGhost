import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // user_id passed as state

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: Deno.env.get("REDIRECT_URI")!,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", await tokenRes.text());
    return new Response("Token exchange failed", { status: 500 });
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();
  const expires_at = Math.floor(Date.now() / 1000) + expires_in;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.from("gmail_tokens").upsert({
    user_id: state,
    access_token,
    refresh_token,
    expires_at,
  });

  if (error) {
    console.error("Failed to save tokens:", error);
    return new Response("Failed to store tokens", { status: 500 });
  }

  const appUrl = Deno.env.get("APP_URL") || "https://yourapp.com";
  return Response.redirect(`${appUrl}/success`, 302);
});
