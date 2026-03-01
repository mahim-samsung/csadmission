import { type ClassValue, clsx } from "clsx";

/**
 * Merge Tailwind class names with deduplication support.
 * Requires `clsx` — install with: npm i clsx
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Sleep for `ms` milliseconds. Useful in crawlers / retry loops.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation up to `attempts` times with exponential back-off.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await sleep(baseDelayMs * 2 ** i);
      }
    }
  }
  throw lastError;
}

/**
 * Truncate a string to `maxLen` characters, appending an ellipsis if needed.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Convert an unknown error to a human-readable string.
 */
export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Normalise a URL — strips trailing slash, lowercases scheme + host.
 */
export function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.hostname}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return raw.trim();
  }
}

/**
 * Chunk an array into smaller arrays of `size`.
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
