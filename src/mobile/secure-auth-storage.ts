import { Capacitor, registerPlugin } from "@capacitor/core";

// Replaces ../integrations/supabase/previewAuthStorage in the native bundle only
// (vite.config.mobile.ts), keeping the generated Supabase client untouched.
// Sessions live in the iOS Keychain (ios/App/App/SecureSessionStoragePlugin.swift)
// instead of the web view's plaintext localStorage.
type SecureSessionStorage = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
};

const keychain = registerPlugin<SecureSessionStorage>("SecureSessionStorage");

export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  if (!Capacitor.isNativePlatform()) return localStorage;
  return {
    // An unreadable session counts as signed out (fails closed); values are never logged.
    getItem: (key: string) =>
      keychain.get({ key }).then(
        ({ value }) => value,
        () => null,
      ),
    setItem: (key: string, value: string) =>
      keychain
        .set({ key, value })
        .catch(() => console.error("fairvitalgo: secure session storage failed")),
    removeItem: (key: string) =>
      keychain
        .remove({ key })
        .catch(() => console.error("fairvitalgo: secure session removal failed")),
  };
}
