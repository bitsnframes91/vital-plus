import { beforeEach, expect, it } from "vitest";
import { readLock, saveLock, rawSignature } from "../lib/app-lock";
beforeEach(() => localStorage.clear());
it("keeps each device lock separate by account", () => {
  saveLock("first", { id: "abc", publicKey: "key" });
  expect(readLock("first")).toEqual({ id: "abc", publicKey: "key" });
  expect(readLock("second")).toBeNull();
});
it("removes only the chosen account's lock", () => {
  saveLock("first", { id: "abc", publicKey: "key" });
  saveLock("second", { id: "def", publicKey: "other" });
  saveLock("first", null);
  expect(readLock("first")).toBeNull();
  expect(readLock("second")?.id).toBe("def");
});
it("fails closed on corrupt stored lock data", () => {
  localStorage.setItem("vivo-app-lock:first", '{"id":false}');
  expect(() => readLock("first")).toThrow();
});
it("converts ECDSA DER signatures into 64-byte Web Crypto format", () => {
  const signature = rawSignature(new Uint8Array([0x30,6,2,1,5,2,1,7]));
  expect(signature.length).toBe(64);
  expect(signature[31]).toBe(5);
  expect(signature[63]).toBe(7);
});