/**
 * gmail-auth — OAuth2 authorization code callback handler
 *
 * This is the redirect URI registered with Google Cloud Console. After the
 * user grants Gmail access in the Google consent screen, Google redirects them
 * here with a one-time `code` and the `state` value that was passed when
 * building the authorization URL.
 *
 * Flow:
 *   1. Extract `code` (Google's one-time auth code) and `state` (user_id) from
 *      the query string.
 *   2. Exchange the code for tokens via Google's token endpoint.
 *   3. Upsert the access token, refresh token, and expiry into `gmail_tokens`.
 *   4. Redirect the user back to the app's success page.
 *
 * State parameter:
 *   InboxGhost passes the Supabase `user.id` as `state` when building the
 *   authorization URL. This is how we know which user to associate the tokens
 *   with after the redirect — there is no session on this edge function request.
 *
 * Environment variables required:
 *   GOOGLE_CLIENT_ID      Google OAuth2 app client ID
 *   GOOGLE_CLIENT_SECRET  Google OAuth2 app client secret
 *   REDIRECT_URI          Must match exactly what is registered in Google Cloud Console
 *   APP_URL               Base URL of the Next.js app (for the post-auth redirect)
 *   SUPABASE_URL          Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  Service role key (bypasses RLS for the token upsert)
 *
 * Success: HTTP 302 redirect to `{APP_URL}/success`
 * Failure: HTTP 400 or 500 with a plain-text error message
 */
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

  // Upsert so that re-connecting Gmail (e.g. after token revocation) replaces
  // the existing row rather than failing on the primary key constraint.
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
