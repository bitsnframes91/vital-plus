import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Bell, Clock, Globe, Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { languages, setLanguage, validLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { defaultSettings, parseSettings, reminderDue, SETTINGS_KEY, showAppNotification, type AppSettings } from "@/lib/app-settings";

type SettingsContext = { settings: AppSettings; update: (value: Partial<AppSettings>) => void };
const Context = createContext<SettingsContext | null>(null);
export function useAppSettings() {
  const value = useContext(Context);
  if (!value) throw new Error("App settings provider missing");
  return value;
}
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const [settings, setSettings] = useState(defaultSettings);
  const [ready, setReady] = useState(false);
  const [reminder, setReminder] = useState(false);
  useEffect(() => { setSettings(parseSettings(localStorage.getItem(SETTINGS_KEY))); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setLanguage(settings.language);
    document.documentElement.lang = settings.language;
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
    document.documentElement.style.colorScheme = settings.theme;
    const theme = document.querySelector('meta[name="theme-color"]');
    theme?.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--browser-theme").trim());
  }, [settings, ready]);
  useEffect(() => {
    if (!ready || !settings.reminders) return;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      const due = reminderDue(settings, new Date(), localStorage.getItem("vivo-last-reminder"));
      if (!due) return;
      localStorage.setItem("vivo-last-reminder", due); setReminder(true);
      if (settings.notifications) void showAppNotification("Vivo", translateText("Zeit für deinen täglichen Check-in.")).catch(() => {});
    };
    check(); const timer = setInterval(check, 30000);
    document.addEventListener("visibilitychange", check);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [settings, ready]);
  return <Context.Provider value={{ settings, update: value => setSettings(previous => ({ ...previous, ...value })) }}>
    <Localized>{children}</Localized>
    <Dialog open={reminder && settings.reminders} onOpenChange={setReminder}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle><Localized>{"Dein täglicher Check-in"}</Localized></DialogTitle><DialogDescription><Localized>{"Zeit für deine Mahlzeiten und Tagesziele."}</Localized></DialogDescription></DialogHeader><Button onClick={() => setReminder(false)}><Localized>{"Alles klar"}</Localized></Button></DialogContent></Dialog>
  </Context.Provider>;
}

export function AppSettingsControls() {
  useLanguage();
  const { settings, update } = useAppSettings();
  const [draftLanguage, setDraftLanguage] = useState(settings.language);
  useEffect(() => { setDraftLanguage(settings.language); }, [settings.language]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const notifications = async (enabled: boolean) => {
    setError(""); setTestSent(false);
    if (!enabled) { update({ notifications: false }); return; }
    if (typeof Notification === "undefined") { setError("Benachrichtigungen werden hier nicht unterstützt. Auf dem iPhone bitte Vivo zum Home-Bildschirm hinzufügen."); return; }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      update({ notifications: permission === "granted" });
      if (permission !== "granted") setError("Bitte erlaube Benachrichtigungen für Vivo in deinen Geräte- oder Browser-Einstellungen.");
    } catch { setError("Benachrichtigungen konnten nicht aktiviert werden."); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setError(""); setTestSent(false);
    try { await showAppNotification("Vivo", translateText("Deine Benachrichtigungen sind aktiviert.")); setTestSent(true); }
    catch (failure) { console.error("Vivo notification failed", failure); setError("Benachrichtigung nicht möglich. Prüfe die Erlaubnis auf deinem Gerät."); }
  };
  return <div className="space-y-3">
    <div className="rounded-lg bg-card px-4 py-4"><label htmlFor="app-language" className="mb-3 flex items-center gap-3 text-[13px] font-semibold"><Globe className="size-5" /><Localized>{"Sprache"}</Localized></label><div className="flex gap-2"><Select value={draftLanguage} onValueChange={value => setDraftLanguage(validLanguage(value))}><SelectTrigger id="app-language" className="min-w-0 flex-1" aria-label={translateText("Sprache")}><SelectValue /></SelectTrigger><SelectContent>{languages.map(language => <SelectItem key={language.value} value={language.value}><Localized>{language.label}</Localized></SelectItem>)}</SelectContent></Select><Button disabled={draftLanguage === settings.language} onClick={() => update({ language: draftLanguage })}><Localized>{"Übernehmen"}</Localized></Button></div></div>
    <div className="rounded-lg bg-card px-4 py-4"><div className="flex items-center gap-3"><Bell className="size-5 shrink-0" /><div className="flex-1"><label htmlFor="notifications" className="text-[13px] font-semibold"><Localized>{"Benachrichtigungen"}</Localized></label><p className="text-xs text-muted-foreground"><Localized>{settings.notifications ? "An" : "Aus"}</Localized></p></div><Switch id="notifications" checked={settings.notifications} disabled={busy} onCheckedChange={notifications} /></div>
      {settings.notifications && <Button variant="outline" className="mt-3 w-full" onClick={test}><Bell /><Localized>{" Testbenachrichtigung"}</Localized></Button>}
      {testSent && <p role="status" className="mt-2 text-xs text-muted-foreground"><Localized>{"Testbenachrichtigung gesendet."}</Localized></p>}
    </div>
    <div className="rounded-lg bg-card px-4 py-4"><div className="mb-3 flex items-center gap-3"><Moon className="size-5" /><span className="text-[13px] font-semibold"><Localized>{"Design"}</Localized></span></div><div className="grid grid-cols-2 gap-2" role="group" aria-label={translateText("Design")}>
      <Button variant={settings.theme === "light" ? "default" : "outline"} aria-pressed={settings.theme === "light"} onClick={() => update({ theme: "light" })}><Sun /><Localized>{" Hell"}</Localized></Button>
      <Button variant={settings.theme === "dark" ? "default" : "outline"} aria-pressed={settings.theme === "dark"} onClick={() => update({ theme: "dark" })}><Moon /><Localized>{" Dunkel"}</Localized></Button>
    </div></div>
    <div className="rounded-lg bg-card px-4 py-4"><div className="flex items-center gap-3"><Clock className="size-5 shrink-0" /><div className="flex-1"><label htmlFor="reminders" className="text-[13px] font-semibold"><Localized>{"Erinnerungen"}</Localized></label><p className="text-xs text-muted-foreground"><Localized>{settings.reminders ? "An" : "Aus"}</Localized></p></div><Switch id="reminders" checked={settings.reminders} onCheckedChange={reminders => update({ reminders })} /></div>
      {settings.reminders && <div className="mt-4"><label htmlFor="reminder-time" className="text-xs font-medium"><Localized>{"Täglich um"}</Localized></label><input id="reminder-time" type="time" value={settings.reminderTime} onChange={e => { if (e.target.value) update({ reminderTime: e.target.value }); }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground" /><p className="mt-2 text-xs leading-5 text-muted-foreground"><Localized>{"Erinnerungen erscheinen, solange Vivo geöffnet ist, oder beim nächsten Öffnen. Keine Zustellung bei geschlossener App."}</Localized></p></div>}
    </div>
    {error && <p role="alert" className="text-xs leading-5 text-destructive"><Localized>{error}</Localized></p>}
  </div>;
}