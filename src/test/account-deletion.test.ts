import { describe, expect, it, vi } from "vitest";
import { deleteWithCode, deletionMac, generateCode, requestDeletionCode, type DeletionDeps } from "@/lib/account-deletion.server";

const SECRET = "s".repeat(64);

/** In-memory model of the database challenge rules (10 min expiry, 5 attempts, single use, 60 s cooldown, 5/hour). */
function fakeBackend(now = { t: 0 }) {
  type Row = { challengeId: string; mac: string | null; attempts: number; expires: number; consumed: boolean; deleting: boolean; lastSent: number; sends: number };
  const rows = new Map<string, Row>();
  const deleted = new Set<string>();
  const sent: { email: string; code: string }[] = [];
  const deps: DeletionDeps = {
    secret: SECRET,
    async issue(u, id, mac) {
      const r = rows.get(u);
      if (r && now.t - r.lastSent < 60_000) return "cooldown";
      if (r && r.sends >= 5) return "limited";
      rows.set(u, { challengeId: id, mac, attempts: 0, expires: now.t + 600_000, consumed: false, deleting: r?.deleting ?? false, lastSent: now.t, sends: (r?.sends ?? 0) + 1 });
      return "ok";
    },
    async currentChallengeId(u) { const r = rows.get(u); return r && !r.consumed && r.expires > now.t ? r.challengeId : null; },
    async consume(u, id, mac) {
      const r = rows.get(u);
      if (!r || !r.mac || r.challengeId !== id || r.consumed) return "invalid";
      if (r.expires <= now.t) return "expired";
      if (r.mac !== mac) { r.attempts++; if (r.attempts >= 5) r.mac = null; return r.attempts >= 5 ? "locked" : "invalid"; }
      r.consumed = true; r.mac = null; r.deleting = true; return "ok";
    },
    async inProgress(u) { return rows.get(u)?.deleting === true; },
    async sendCode(email, code) { sent.push({ email, code }); return true; },
    cleanup: vi.fn(async () => {}),
    async deleteAuthUser(u) { deleted.add(u); },
    async clearChallenge(u) { rows.delete(u); },
  };
  return { deps, rows, deleted, sent, now };
}

describe("account deletion challenge", () => {
  it("generates uniform 6-digit codes and keyed MACs bound to user and challenge", async () => {
    expect(generateCode()).toMatch(/^\d{6}$/);
    const a = await deletionMac(SECRET, "u1", "c1", "123456");
    expect(a).not.toBe(await deletionMac(SECRET, "u2", "c1", "123456"));
    expect(a).not.toBe(await deletionMac(SECRET, "u1", "c2", "123456"));
    expect(a).not.toBe(await deletionMac("t".repeat(64), "u1", "c1", "123456"));
    await expect(deletionMac("", "u1", "c1", "123456")).rejects.toThrow();
  });

  it("rejects a wrong code such as 000000", async () => {
    const b = fakeBackend();
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    const wrong = b.sent[0]!.code === "000000" ? "111111" : "000000";
    expect(await deleteWithCode(b.deps, "u1", wrong)).toEqual({ ok: false, reason: "invalid" });
    expect(b.deleted.size).toBe(0);
  });

  it("rejects an expired code", async () => {
    const b = fakeBackend();
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    b.now.t += 10 * 60_000 + 1;
    expect((await deleteWithCode(b.deps, "u1", b.sent[0]!.code)).ok).toBe(false);
    expect(b.deleted.size).toBe(0);
  });

  it("rejects a reused code", async () => {
    const b = fakeBackend();
    b.deps.deleteAuthUser = async () => { throw new Error("down"); };
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    const code = b.sent[0]!.code;
    expect(await deleteWithCode(b.deps, "u1", code)).toEqual({ ok: false, reason: "cleanup_failed" });
    expect(await deleteWithCode(b.deps, "u1", code)).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a code belonging to another account", async () => {
    const b = fakeBackend();
    await requestDeletionCode(b.deps, "victim", "v@test.dev");
    await requestDeletionCode(b.deps, "attacker", "x@test.dev");
    const victimCode = b.sent[0]!.code;
    const attackerCode = b.sent[1]!.code;
    if (victimCode !== attackerCode) expect((await deleteWithCode(b.deps, "attacker", victimCode)).ok).toBe(false);
    expect(b.deleted.has("victim")).toBe(false);
  });

  it("locks the challenge after five wrong attempts", async () => {
    const b = fakeBackend();
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    const code = b.sent[0]!.code;
    const wrong = code === "999999" ? "888888" : "999999";
    for (let i = 0; i < 4; i++) expect((await deleteWithCode(b.deps, "u1", wrong)).ok).toBe(false);
    expect(await deleteWithCode(b.deps, "u1", wrong)).toEqual({ ok: false, reason: "locked" });
    expect((await deleteWithCode(b.deps, "u1", code)).ok).toBe(false);
  });

  it("refuses deletion for an authenticated session without verification", async () => {
    const b = fakeBackend();
    expect(await deleteWithCode(b.deps, "u1", null)).toEqual({ ok: false, reason: "invalid" });
    expect(b.deleted.size).toBe(0);
  });

  it("deletes only the intended account with the correct code", async () => {
    const b = fakeBackend();
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    await requestDeletionCode(b.deps, "u2", "b@test.dev");
    expect(await deleteWithCode(b.deps, "u1", b.sent[0]!.code)).toEqual({ ok: true });
    expect([...b.deleted]).toEqual(["u1"]);
  });

  it("resumes a verified deletion after a partial failure without a new code", async () => {
    const b = fakeBackend();
    let fail = true;
    b.deps.deleteAuthUser = async (u) => { if (fail) throw new Error("down"); b.deleted.add(u); };
    await requestDeletionCode(b.deps, "u1", "a@test.dev");
    expect((await deleteWithCode(b.deps, "u1", b.sent[0]!.code)).ok).toBe(false);
    fail = false;
    expect(await deleteWithCode(b.deps, "u1", null)).toEqual({ ok: true });
    expect(b.deleted.has("u1")).toBe(true);
  });

  it("enforces the 60-second resend cooldown and reports failed email delivery", async () => {
    const b = fakeBackend();
    expect(await requestDeletionCode(b.deps, "u1", "a@test.dev")).toEqual({ ok: true });
    expect(await requestDeletionCode(b.deps, "u1", "a@test.dev")).toEqual({ ok: false, reason: "cooldown" });
    b.now.t += 61_000;
    b.deps.sendCode = async () => false;
    expect(await requestDeletionCode(b.deps, "u1", "a@test.dev")).toEqual({ ok: false, reason: "send_failed" });
  });
});
