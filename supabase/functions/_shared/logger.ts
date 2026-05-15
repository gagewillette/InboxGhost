/**
 * Structured logger for Supabase edge functions.
 *
 * Each function gets its own logger via `createLogger`. Pass the env var name
 * that gates output so individual functions can be toggled independently:
 *
 *   import { createLogger } from "../_shared/logger.ts";
 *   const log = createLogger("classify", "VERBOSE_CLASSIFY");
 *
 * Set the env var to "true" in supabase/functions/.env (local) or as a Supabase
 * secret to enable logging for that function. All loggers are silent by default.
 */

export interface Logger {
  // deno-lint-ignore no-explicit-any
  info(...args: any[]): void;
  // deno-lint-ignore no-explicit-any
  json(label: string, value: any): void;
  // deno-lint-ignore no-explicit-any
  error(...args: any[]): void;
}

export function createLogger(tag: string, envVar: string): Logger {
  const enabled = Deno.env.get(envVar) === "true";
  const prefix = `[${tag}]`;

  return {
    // deno-lint-ignore no-explicit-any
    info(...args: any[]) {
      if (enabled) console.log(prefix, ...args);
    },
    // deno-lint-ignore no-explicit-any
    json(label: string, value: any) {
      if (enabled) console.log(prefix, label, JSON.stringify(value, null, 2));
    },
    // deno-lint-ignore no-explicit-any
    error(...args: any[]) {
      if (enabled) console.error(prefix, ...args);
    },
  };
}

// Legacy sync logger — kept for backwards compatibility with existing callers.
const _syncEnabled = Deno.env.get("VERBOSE_SYNC") === "true";

// deno-lint-ignore no-explicit-any
export function log(...args: any[]): void {
  if (_syncEnabled) console.log("[sync]", ...args);
}

// deno-lint-ignore no-explicit-any
export function logJson(label: string, value: any): void {
  if (_syncEnabled) console.log("[sync]", label, JSON.stringify(value, null, 2));
}
