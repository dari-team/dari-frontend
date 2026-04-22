// src/lib/apiMonitor.ts
// Centralized API request monitoring, structured logging, and retry logic.
// Tracks every Google Maps API call for cost analysis and debugging.

// ── Types ─────────────────────────────────────────────────────────────────────

export type ApiCallLog = {
  api: string;
  params: Record<string, unknown>;
  status: "success" | "error";
  errorMessage?: string;
  errorCode?: string;
  timestamp: number;
  durationMs: number;
};

type ApiStats = {
  totalCalls: number;
  successCount: number;
  errorCount: number;
  callsByApi: Record<string, number>;
  recentErrors: ApiCallLog[];
};

// ── In-memory tracking ────────────────────────────────────────────────────────

const LOG_LIMIT = 200;
const callLog: ApiCallLog[] = [];

function pushLog(entry: ApiCallLog) {
  callLog.push(entry);
  if (callLog.length > LOG_LIMIT) callLog.shift();
}

// ── Structured logger ─────────────────────────────────────────────────────────

function logApiCall(entry: ApiCallLog) {
  const prefix = entry.status === "success" ? "[API ✓]" : "[API ✗]";
  const msg = `${prefix} ${entry.api} (${entry.durationMs}ms)`;

  if (entry.status === "error") {
    console.error(msg, {
      api: entry.api,
      params: entry.params,
      errorCode: entry.errorCode,
      errorMessage: entry.errorMessage,
    });
  } else {
    console.log(msg, { params: entry.params });
  }
}

// ── Request wrapper with retry ────────────────────────────────────────────────

/**
 * Wraps any async API call with:
 * - Structured logging (api name, params, status, error)
 * - Single retry on network failure
 * - Frequency tracking
 * - Graceful failure (never throws to caller by default)
 */
export async function apiRequestWrapper<T>(
  apiName: string,
  fn: () => Promise<T>,
  params: Record<string, unknown> = {},
  options: { retryOnNetworkError?: boolean; throwOnError?: boolean } = {}
): Promise<T | null> {
  const { retryOnNetworkError = true, throwOnError = false } = options;
  const start = performance.now();

  async function attempt(): Promise<T> {
    return fn();
  }

  try {
    const result = await attempt();
    const duration = Math.round(performance.now() - start);

    const entry: ApiCallLog = {
      api: apiName,
      params,
      status: "success",
      timestamp: Date.now(),
      durationMs: duration,
    };

    pushLog(entry);
    logApiCall(entry);

    return result;
  } catch (err: unknown) {
    const isNetworkError =
      err instanceof TypeError && err.message.includes("fetch") ||
      (err as { code?: string })?.code === "NETWORK_ERROR";

    // Retry once on network failure
    if (retryOnNetworkError && isNetworkError) {
      console.warn(`[API RETRY] ${apiName} — network error, retrying once...`);
      try {
        const result = await attempt();
        const duration = Math.round(performance.now() - start);
        const entry: ApiCallLog = {
          api: apiName,
          params,
          status: "success",
          timestamp: Date.now(),
          durationMs: duration,
        };
        pushLog(entry);
        logApiCall(entry);
        return result;
      } catch (retryErr) {
        // Fall through to error handling
        err = retryErr;
      }
    }

    const duration = Math.round(performance.now() - start);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = (err as { code?: string })?.code ?? "UNKNOWN";

    const entry: ApiCallLog = {
      api: apiName,
      params,
      status: "error",
      errorMessage,
      errorCode,
      timestamp: Date.now(),
      durationMs: duration,
    };

    pushLog(entry);
    logApiCall(entry);

    if (throwOnError) throw err;
    return null;
  }
}

// ── Stats & debugging ─────────────────────────────────────────────────────────

export function getApiStats(): ApiStats {
  const callsByApi: Record<string, number> = {};
  let successCount = 0;
  let errorCount = 0;

  for (const log of callLog) {
    callsByApi[log.api] = (callsByApi[log.api] ?? 0) + 1;
    if (log.status === "success") successCount++;
    else errorCount++;
  }

  return {
    totalCalls: callLog.length,
    successCount,
    errorCount,
    callsByApi,
    recentErrors: callLog.filter((l) => l.status === "error").slice(-10),
  };
}

export function getCallLog(): readonly ApiCallLog[] {
  return callLog;
}

export function clearCallLog(): void {
  callLog.length = 0;
}