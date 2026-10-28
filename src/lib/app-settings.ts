import { validLanguage, type Language } from "./language";
export type AppTheme = "light" | "dark";
export type AppSettings = { language: Language; theme: AppTheme; notifications: boolean; reminders: boolean; reminderTime: string };
export const defaultSettings: AppSettings = { language: "de", theme: "light", notifications: false, reminders: false, reminderTime: "19:00" };
export const SETTINGS_KEY = "vivo-app-settings";
export function parseSettings(value: string | null): AppSettings {
  try {
    const s = JSON.parse(value ?? "null");
    return { language: validLanguage(s?.language), theme: s?.theme === "dark" ? "dark" : "light", notifications: s?.notifications === true, reminders: s?.reminders === true, reminderTime: typeof s?.reminderTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.reminderTime) ? s.reminderTime : "19:00" };
  } catch { return { ...defaultSettings }; }
}
export function reminderDue(settings: AppSettings, now: Date, lastDay: string | null) {
  const day = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return settings.reminders && lastDay !== day && time >= settings.reminderTime ? day : null;
}
export async function showAppNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") throw new Error("permission");
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
  if (registration) await registration.showNotification(title, { body, icon: "/icons/apple-touch-icon.png", tag: "vivo-reminder" });
  else new Notification(title, { body, icon: "/icons/apple-touch-icon.png" });
}
