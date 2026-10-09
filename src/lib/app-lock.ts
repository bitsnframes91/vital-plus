export type LockCredential = { id: string; publicKey: string };
const prefix = "vivo-app-lock:";
export const encode = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
export const decode = (text: string): ArrayBuffer => Uint8Array.from(atob(text), c => c.charCodeAt(0)).buffer;
export function readLock(userId: string): LockCredential | null {
  const value = localStorage.getItem(prefix + userId);
  if (!value) return null;
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || !("id" in parsed) || !("publicKey" in parsed) || typeof parsed.id !== "string" || typeof parsed.publicKey !== "string") throw new Error("Invalid lock configuration");
  return { id: parsed.id, publicKey: parsed.publicKey };
}
export function saveLock(userId: string, credential: LockCredential | null) {
  if (credential) localStorage.setItem(prefix + userId, JSON.stringify(credential));
  else localStorage.removeItem(prefix + userId);
}
export async function supportsAppLock() {
  return window.isSecureContext && typeof PublicKeyCredential !== "undefined" && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}
export async function createLock(userId: string): Promise<LockCredential> {
  const credential = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: "Vitalplus App Lock", id: window.location.hostname },
    user: { id: new TextEncoder().encode(userId), name: "Vitalplus App Lock", displayName: "Vitalplus App Lock" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
    timeout: 60000, attestation: "none",
  } });
  if (!(credential instanceof PublicKeyCredential) || !(credential.response instanceof AuthenticatorAttestationResponse)) throw new Error("Verification cancelled");
  const key = credential.response.getPublicKey();
  const flags = new Uint8Array(credential.response.getAuthenticatorData())[32] ?? 0;
  if (!key || credential.response.getPublicKeyAlgorithm() !== -7 || (flags & 5) !== 5) throw new Error("Unsupported device key");
  return { id: encode(credential.rawId), publicKey: encode(key) };
}

// WebAuthn returns DER ECDSA signatures; Web Crypto expects IEEE P1363 r || s.
export function rawSignature(der: Uint8Array): Uint8Array<ArrayBuffer> {
  if (der[0] !== 0x30 || der[2] !== 0x02) throw new Error("Invalid signature");
  const rLength = der[3] ?? 0;
  const sOffset = 4 + rLength;
  if (der[sOffset] !== 0x02) throw new Error("Invalid signature");
  const sLength = der[sOffset + 1] ?? 0;
  const result = new Uint8Array(64);
  const r = der.slice(4, sOffset).slice(-32);
  const s = der.slice(sOffset + 2, sOffset + 2 + sLength).slice(-32);
  result.set(r, 32 - r.length); result.set(s, 64 - s.length);
  return result;
}
export async function verifyLock(credential: LockCredential): Promise<void> {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const assertion = await navigator.credentials.get({ publicKey: {
    challenge, rpId: window.location.hostname,
    allowCredentials: [{ id: decode(credential.id), type: "public-key", transports: ["internal"] }],
    userVerification: "required", timeout: 60000,
  } });
  if (!(assertion instanceof PublicKeyCredential) || !(assertion.response instanceof AuthenticatorAssertionResponse) || encode(assertion.rawId) !== credential.id) throw new Error("Verification cancelled");
  const response = assertion.response;
  const client = JSON.parse(new TextDecoder().decode(response.clientDataJSON));
  const expected = encode(challenge.buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const auth = new Uint8Array(response.authenticatorData);
  const rpHash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(window.location.hostname)));
  if (client.type !== "webauthn.get" || client.origin !== window.location.origin || client.challenge !== expected || client.crossOrigin === true || auth.length < 37 || ((auth[32] ?? 0) & 5) !== 5 || !rpHash.every((n, i) => auth[i] === n)) throw new Error("Invalid verification");
  const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", response.clientDataJSON));
  const data = new Uint8Array(auth.length + clientHash.length); data.set(auth); data.set(clientHash, auth.length);
  const key = await crypto.subtle.importKey("spki", decode(credential.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, rawSignature(new Uint8Array(response.signature)), data)) throw new Error("Invalid signature");
}