// Origins used by the Capacitor iOS/Android shells when the app bundle runs locally.
export const NATIVE_APP_ORIGINS = [
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost",
  "https://localhost",
] as const;

export const PUBLISHED_APP_URL = "https://fairvitalgo.lovable.app";

export function isNativeAppOrigin(origin: string | null | undefined): boolean {
  return !!origin && (NATIVE_APP_ORIGINS as readonly string[]).includes(origin);
}
