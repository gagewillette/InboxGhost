const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

export function buildGmailAuthUrl(userId: string): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/gmail-auth`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
