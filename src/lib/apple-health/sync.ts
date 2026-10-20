import { READ_TYPES, errorCode, type HealthBridge } from "./bridge";
import { normalizeSummary, type ImportedSummary } from "./summary";

export class SyncCancelled extends Error {
  constructor() {
    super("Apple Health sync cancelled");
  }
}

/** Default import window: today and the previous 6 days. */
export const IMPORT_DAYS = 7;

function cancellable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new SyncCancelled());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new SyncCancelled());
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

/**
 * Reads a bounded daily summary. A cancelled sync discards whatever the native query returns.
 * Transient failures are retried with backoff; unavailable HealthKit or invalid input are not.
 */
export async function importSummary(
  bridge: HealthBridge,
  options: {
    days?: number;
    signal?: AbortSignal;
    retries?: number;
    wait?: (ms: number) => Promise<void>;
  } = {},
): Promise<ImportedSummary> {
  const {
    days = IMPORT_DAYS,
    signal,
    retries = 2,
    wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      const raw = await cancellable(bridge.readDailySummary({ days, types: READ_TYPES }), signal);
      return normalizeSummary(raw);
    } catch (error) {
      if (error instanceof SyncCancelled || signal?.aborted) throw new SyncCancelled();
      const code = errorCode(error);
      if (attempt >= retries || code === "UNAVAILABLE" || code === "INVALID") throw error;
      await cancellable(wait(500 * 2 ** attempt), signal);
    }
  }
}
