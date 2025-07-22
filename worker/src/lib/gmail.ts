import dotenv from 'dotenv';

dotenv.config();


const GMAIL_API_URL = 'https://gmail.googleapis.com/gmail/v1'

export async function refreshAccessToken(refreshToken: string) {
  console.log('refreshing access token');

  const params = new URLSearchParams()

  // TODO: remove these hardcoded things
  params.append('client_id', process.env.GOOGLE_CLIENT_ID as string)
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET as string)
  params.append('refresh_token', refreshToken)
  params.append('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  const resultText = await res.text()

  console.log("new refresh token fetched");
  console.log(JSON.parse(resultText));

  if (!res.ok) {
    console.error('❌ Failed to refresh token:', resultText)
    return null
  }

  console.info('✅ Refreshed token successfully!')
  return JSON.parse(resultText) as { access_token: string; expires_in: number }
}


async function gmailRequest<T>(accessToken: string, path: string, debug?: string ): Promise<T> {
  const res = await fetch(`${GMAIL_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    throw new Error(`Gmail request failed: ${res.status} ${res.statusText}`)
  }

  if (debug) console.log(`[GMAIL DEBUG 🐞] ${debug}`);

  return res.json() as Promise<T>
}


// this function (as of now) is only fetching from the primary inbox by using query params
// here are a list of labelIds for future reference if needed to be changed

// CATEGORY_PERSONAL => Primary Inbox
// CATEGORY_SOCIAL => Social Inbox 
// CATEGORY_PROMOTIONS => Promos
// CATEGORY_UPDATES => Updates (idk what this is)
// CATEGORY_FORUMS => Foums (idk what this is either lmao)
export function listRecentThreads(accessToken: string) {
  return gmailRequest<{ threads?: { id: string }[] }>(
    accessToken,
    '/users/me/threads?maxResults=100&q=in:inbox -category:social -category:promotions newer_than:9d',
    'recentThreads'
  )
}

export function getThread(accessToken: string, threadId: string) {
  return gmailRequest<{ messages: { id: string }[] }>(
    accessToken,
    `/users/me/threads/${threadId}?format=metadata`,
    'getThreads'
  )
}

export function getMessage(accessToken: string, messageId: string) {
  return gmailRequest<any>(
    accessToken,
    `/users/me/messages/${messageId}?format=full`,
    'getMessage'
  )
}