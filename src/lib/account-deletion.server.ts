// Server-only account-deletion challenge logic. The 6-digit code is never stored:
// only an HMAC-SHA256 (server secret) bound to user, challenge and operation.

const OPERATION = "account-delete:v1";

export type IssueResult = "ok" | "cooldown" | "limited";
export type ConsumeResult = "ok" | "invalid" | "expired" | "locked";

/** Uniform 6-digit code from a CSPRNG (rejection sampling avoids modulo bias). */
export function generateCode(rand: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)): string {
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  for (;;) {
    const n = rand(new Uint32Array(1))[0]!;
    if (n < limit) return String(n % 1_000_000).padStart(6, "0");
  }
}

/** HMAC-SHA256(secret, operation|user|challenge|code) as hex. */
export async function deletionMac(secret: string, userId: string, challengeId: string, code: string): Promise<string> {
  if (!secret || secret.length < 32) throw new Error("deletion secret missing");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${OPERATION}|${userId}|${challengeId}|${code}`));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface DeletionDeps {
  secret: string;
  issue(userId: string, challengeId: string, mac: string): Promise<IssueResult>;
  currentChallengeId(userId: string): Promise<string | null>;
  consume(userId: string, challengeId: string, mac: string): Promise<ConsumeResult>;
  inProgress(userId: string): Promise<boolean>;
  sendCode(email: string, code: string, challengeId: string): Promise<boolean>;
  cleanup(userId: string): Promise<void>;
  deleteAuthUser(userId: string): Promise<void>;
  clearChallenge(userId: string): Promise<void>;
}

export type RequestOutcome = { ok: true } | { ok: false; reason: "cooldown" | "limited" | "send_failed" };

/** Creates a challenge and sends the code. Success only when the email API accepted the send. */
export async function requestDeletionCode(deps: DeletionDeps, userId: string, email: string): Promise<RequestOutcome> {
  const challengeId = crypto.randomUUID();
  const code = generateCode();
  const result = await deps.issue(userId, challengeId, await deletionMac(deps.secret, userId, challengeId, code));
  if (result !== "ok") return { ok: false, reason: result };
  const sent = await deps.sendCode(email, code, challengeId);
  return sent ? { ok: true } : { ok: false, reason: "send_failed" };
}

export type DeleteOutcome = { ok: true } | { ok: false; reason: ConsumeResult | "cleanup_failed" };

async function retry(fn: () => Promise<void>, times = 3) {
  let last: unknown;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e) { last = e; }
  }
  throw last;
}

/**
 * Verifies and consumes the code atomically, then deletes app data and the auth user.
 * A verified deletion that failed part-way is resumable (server-side state only) by the same user
 * calling without a code; a code is never accepted twice.
 */
export async function deleteWithCode(deps: DeletionDeps, userId: string, code: string | null): Promise<DeleteOutcome> {
  if (code === null) {
    if (!(await deps.inProgress(userId))) return { ok: false, reason: "invalid" };
  } else {
    if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid" };
    const challengeId = await deps.currentChallengeId(userId);
    if (!challengeId) return { ok: false, reason: "invalid" };
    const result = await deps.consume(userId, challengeId, await deletionMac(deps.secret, userId, challengeId, code));
    if (result !== "ok") return { ok: false, reason: result };
  }
  try {
    await retry(() => deps.cleanup(userId));
    await retry(() => deps.deleteAuthUser(userId));
    await retry(() => deps.clearChallenge(userId)).catch(() => undefined);
  } catch {
    return { ok: false, reason: "cleanup_failed" };
  }
  return { ok: true };
}
