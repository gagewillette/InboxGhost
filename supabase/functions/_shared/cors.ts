/**
 * cors.ts — shared CORS headers and response helpers
 *
 * All edge functions that are called from the browser must include CORS headers
 * so the browser allows the cross-origin fetch. Every function should:
 *   1. Return `corsOk()` immediately for OPTIONS (preflight) requests.
 *   2. Use `json()` instead of `new Response()` for every other response so
 *      the CORS headers are always present.
 */

/** CORS headers attached to every response. Wildcard origin is intentional —
 *  Supabase JWT validation is the actual auth layer, not origin-pinning. */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Serialize `data` as JSON and attach CORS + Content-Type headers. */
export function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Return a 200 OK with CORS headers for OPTIONS preflight requests. */
export function corsOk(): Response {
  return new Response("OK", { status: 200, headers: CORS });
}
