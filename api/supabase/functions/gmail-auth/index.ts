import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// update this on each push
console.log("version: 0.0.2")

// TODO: figure out JWT with legacy secret bullshit. this funciton needs to be more reliable and safe

serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // optional: user ID or session ID

  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  // Exchange code for tokens with Google
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: Deno.env.get("REDIRECT_URI")!, // e.g. https://<your-project>.functions.supabase.co/gmail-auth
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const error = await tokenRes.text();
    console.error("Token exchange failed:", error);
    return new Response("Token exchange failed", { status: 500 });
  }

  const tokenData = await tokenRes.json();

  const {
    access_token,
    refresh_token,
    expires_in,
  }: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } = tokenData;

  const expires_at = Math.floor(Date.now() / 1000) + expires_in;

  // Connect to Supabase using service role
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Store tokens in your DB, keyed by user_id (or state)
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

  // Optional: redirect user back to your frontend
  return Response.redirect("https://yourapp.com/success", 302);
});

