import { expect, it } from "vitest";
import { defaultSettings, parseSettings, reminderDue } from "../lib/app-settings";
it("restores Dunkel and both enabled switches", () => {
  expect(parseSettings('{"theme":"dark","notifications":true,"reminders":true,"reminderTime":"12:00"}')).toEqual({ theme: "dark", notifications: true, reminders: true, reminderTime: "12:00" });
});
it("defaults to Hell and opt-in off", () => { expect(parseSettings(null)).toEqual(defaultSettings); });
it("does not send reminders when off", () => { expect(reminderDue(defaultSettings, new Date(2026,9,6,20), null)).toBeNull(); });
it("sends an enabled reminder only after the chosen time", () => {
  const settings = { ...defaultSettings, reminders: true, reminderTime: "19:00" };
  expect(reminderDue(settings, new Date(2026,9,6,18,59), null)).toBeNull();
  expect(reminderDue(settings, new Date(2026,9,6,19), null)).toBe("2026-10-6");
});
it("does not repeat today's reminder", () => { expect(reminderDue({ ...defaultSettings, reminders: true }, new Date(2026,9,6,20), "2026-10-6")).toBeNull(); });