import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Upload, Trash2, Info } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { fmtDate, status, labMarkers as catalog, type LabMarker } from "@/lib/data";
import { analyzeLabPdf } from "@/lib/ai.functions";
import { blobToBase64 } from "@/lib/record-wav";
import { RangeBar } from "@/components/RangeBar";
import { StatusFace, type StatusMood } from "@/components/StatusFace";
import { LaborMascot } from "@/components/LaborMascot";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { labInformation } from "@/lib/lab-information";

export const Route = createFileRoute("/labor")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Laborwerte — Vitalplus" },
      { name: "description", content: "Laborwerte erfassen, Verlauf verstehen und Nachkontrollen planen." },
      { property: "og:title", content: "Laborwerte — Vitalplus" },
      { property: "og:description", content: "Deine Blutwerte im Verlauf – verständlich erklärt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Labs,
});

const toneMood: Record<"ok" | "warn" | "severe", StatusMood> = { ok: "good", warn: "neutral", severe: "bad" };

function Labs() {
  useLanguage();
  const { s, set } = useStore();
  // New accounts start without lab values; offer the standard markers for manual entry.
  const options: LabMarker[] = [...s.labs, ...catalog.filter((c) => !s.labs.some((l) => l.id === c.id)).map((c) => ({ ...c, history: [] }))];
  const [marker, setMarker] = useState(options[0]?.id ?? "");
  const [value, setValue] = useState("");
  const analyze = useServerFn(analyzeLabPdf);
  const [busy, setBusy] = useState(false);
  const [infoMarkerId, setInfoMarkerId] = useState<string | null>(null);
  const infoMarker = s.labs.find(m => m.id === infoMarkerId);
  const info = infoMarker ? labInformation(infoMarker) : null;
  const [confirmAll, setConfirmAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 7 + 2, 88)), 400);
    return () => clearInterval(t);
  }, [busy]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !file.type.startsWith("image/")) return setMsg({ ok: false, text: "Bitte eine PDF-Datei oder ein Foto wählen." });
    setBusy(true);
    setProgress(4);
    setMsg(null);
    try {
      const blob: Blob = isPdf ? file : await shrinkPhoto(file);
      if (blob.size > 10 * 1024 * 1024) { setProgress(0); return setMsg({ ok: false, text: "Die Datei ist größer als 10 MB." }); }
      const r = await analyze({ data: { filename: file.name, mimeType: isPdf ? "application/pdf" as const : "image/jpeg" as const, base64: await blobToBase64(blob), knownIds: s.labs.map((l) => l.id), meals: s.meals.slice(-100).map(({ name, date, kcal, protein, fiber, carbs, fat }) => ({ name, date, kcal, protein, fiber, carbs, fat })) } });
      if (!r.ok) { setProgress(0); return setMsg({ ok: false, text: r.error }); }
      let labs: LabMarker[] = [...s.labs];
      for (const m of r.markers) {
        const idx = labs.findIndex((l) => l.id === m.id || l.name.toLowerCase() === m.name.toLowerCase());
        const point = { date: r.date, value: m.value };
        if (idx >= 0) {
          labs[idx] = { ...labs[idx]!, history: [...labs[idx]!.history.filter((h) => h.date !== r.date), point].sort((a, b) => a.date.localeCompare(b.date)) };
        } else {
          labs = [...labs, {
            id: `pdf-${m.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            name: m.name, unit: m.unit,
            target: [m.targetLow ?? 0, m.targetHigh ?? Math.max(m.value * 1.5, 1)],
            history: [point], retestWeeks: 12, note: "Aus deinem Laborbefund übernommen.",
          }];
        }
      }
      set({ labs, aiPlan: r.plan.length ? { date: r.date, items: r.plan } : s.aiPlan });
      setMsg({ ok: true, text: `${r.markers.length} Werte vom ${fmtDate(r.date)} übernommen. Dein Plan wurde aktualisiert.` });
      setProgress(100);
      setTimeout(() => setProgress(0), 4000);
    } catch {
      setMsg({ ok: false, text: "Der Befund konnte nicht gelesen werden." });
      setProgress(0);
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(value.replace(",", "."));
    if (isNaN(v)) return;
    const date = new Date().toISOString().slice(0, 10);
    const point = { date, value: v };
    if (s.labs.some((l) => l.id === marker)) {
      set({ labs: s.labs.map((l) => (l.id === marker ? { ...l, history: [...l.history, point] } : l)) });
    } else {
      const base = options.find((o) => o.id === marker);
      if (!base) return;
      set({ labs: [...s.labs, { ...base, history: [point] }] });
    }
    setValue("");
  };

  const removeAll = () => {
    // Removing all values also removes the plan derived from the report (Plan + Heute Tagesziele).
    const actionsDone = Object.fromEntries(Object.entries(s.actionsDone).filter(([k]) => !k.includes(":plan-")));
    set({ labs: [], aiPlan: null, actionsDone });
    setConfirmAll(false);
    setMarker(catalog[0]?.id ?? "");
  };

  return (
    <AppShell>
      <header className="labor-mascot-header relative overflow-hidden bg-card px-6 pb-8 pt-9">
        <div className="labor-mascot-copy relative">
          <span className="font-data text-[12px] uppercase text-fv-deep"><Localized>Labor</Localized></span>
          <h1 className="mt-4 text-[29px] font-bold leading-[1.15] text-foreground"><Localized>Deine Laborwerte</Localized></h1>
          <p className="mt-3 text-sm text-muted-foreground"><Localized>Werte erfassen, Verlauf sehen, Nachkontrolle nicht vergessen.</Localized></p>
        </div>
        <LaborMascot />
      </header>
      <div className="space-y-3 px-4 pt-4">
        <label className={`card-surface flex cursor-pointer items-center gap-3 p-5 ${busy ? "opacity-60" : ""}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fv/10 text-fv-deep"><Upload size={20} strokeWidth={2.2} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium"><Localized>{busy ? "Befund wird gelesen…" : "Laborbefund hochladen"}</Localized></div>
            <div className="text-[12px] text-ink/45"><Localized>{"Die App liest deine Werte aus und erstellt deinen Plan."}</Localized></div>
          </div>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy}
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className={`card-surface flex cursor-pointer items-center gap-3 p-5 ${busy ? "opacity-60" : ""}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fv/10 text-fv-deep"><Camera size={20} strokeWidth={2.2} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium"><Localized>{"Befund fotografieren"}</Localized></div>
            <div className="text-[12px] text-ink/45"><Localized>{"Kamera öffnen und deine Blutwerte abfotografieren."}</Localized></div>
          </div>
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy}
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {(busy || progress === 100) && (
          <div className="card-surface space-y-2 p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-ink/55"><Localized>{progress === 100 ? "Fertig – Werte übernommen" : "Befund wird hochgeladen und gelesen…"}</Localized></span>
              <span className="font-data text-fv-deep"><Localized>{Math.round(progress)}</Localized><Localized>{"%"}</Localized></span>
            </div>
            <Progress value={progress} className="h-2 bg-fv/10 [&_[data-slot=progress-indicator]]:bg-fresh" />
          </div>
        )}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-[13px] ${msg.ok ? "bg-fv/10 text-fv-deep" : "bg-warn/15"}`}>
            <Localized>{msg.text}</Localized> {msg.ok && <Link to="/plan" className="font-medium underline"><Localized>{"Zum Plan →"}</Localized></Link>}
          </div>
        )}
        {s.labs.length === 0 && (
          <p className="card-surface p-5 text-[14px] text-ink/55"><Localized>{"Noch keine Laborwerte. Lade einen Befund hoch oder trage unten einen Standardwert ein."}</Localized></p>
        )}
        {s.labs.map((m) => {
          const last = m.history[m.history.length - 1]!;
          const st = status(m);
          return (
            <div key={m.id} className="card-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow"><Localized>{m.name}</Localized></div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-data text-[28px] font-medium"><Localized>{last.value}</Localized></span>
                    <span className="font-data text-[13px] text-ink/45"><Localized>{m.unit}</Localized></span>
                  </div>
                  <div className="text-[12px] text-ink/45"><Localized>{"Ziel "}</Localized><Localized>{m.target[0]}</Localized><Localized>{"–"}</Localized><Localized>{m.target[1]}</Localized><Localized>{" · "}</Localized><Localized>{fmtDate(last.date)}</Localized></div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-data text-[12px] uppercase tracking-normal ${st.tone === "ok" ? "bg-fv/10 text-fv-deep" : st.tone === "warn" ? "bg-warn/20 text-ink" : "bg-bmi-bad/10 text-bmi-bad"}`}>
                    <StatusFace mood={toneMood[st.tone]} className="size-4" />
                    <Localized>{st.label}</Localized>
                  </span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setInfoMarkerId(m.id)} aria-label={translateText(`Information zu ${m.name}`)} title={translateText(`Information zu ${m.name}`)} className="size-8 rounded-full text-fv-deep hover:bg-fv/10">
                    <Info size={16} strokeWidth={2} aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="mt-4"><RangeBar marker={m} /></div>
              <p className="mt-3 border-t pt-3 text-[13px] text-ink/55"><Localized>{m.note}</Localized><Localized>{" Nachkontrolle in "}</Localized><Localized>{m.retestWeeks}</Localized><Localized>{" Wochen."}</Localized></p>
            </div>
          );
        })}

        {s.labs.length > 0 && (
          confirmAll ? (
            <div className="card-surface flex items-center justify-between gap-3 p-4">
              <span className="text-[13px] text-ink/70"><Localized>{"Alle Werte löschen? Danach kannst du direkt einen neuen Befund hochladen."}</Localized></span>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmAll(false)} className="rounded-full border border-border px-3 py-1.5 text-[12px] font-medium"><Localized>{"Behalten"}</Localized></button>
                <button onClick={removeAll} className="rounded-full bg-bmi-bad/10 px-3 py-1.5 text-[12px] font-medium text-bmi-bad"><Localized>{"Alle löschen"}</Localized></button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmAll(true)} className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-ink/45 underline underline-offset-2 hover:text-bmi-bad">
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" /><Localized>{"Alle Werte löschen "}</Localized></button>
          )
        )}

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow"><Localized>{"Neuen Wert eintragen"}</Localized></div>
          <select value={marker} onChange={(e) => setMarker(e.target.value)} className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none">
            {options.map((l) => <option key={l.id} value={l.id}><Localized>{l.name}</Localized><Localized>{" ("}</Localized><Localized>{l.unit}</Localized><Localized>{")"}</Localized></option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={translateText("Wert")} className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink"><Localized>{"Speichern"}</Localized></button>
        </form>

        <p className="px-1 text-[12px] text-ink/40"><Localized>{"Hinweis: Vitalplus stellt keine Diagnosen. Bitte besprich auffällige Werte mit deiner Ärztin oder deinem Arzt. Labor-Anbindung folgt."}</Localized></p>
      </div>
      <Dialog open={Boolean(infoMarker)} onOpenChange={open => { if (!open) setInfoMarkerId(null); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle className="pr-6 leading-snug tracking-normal"><Localized>{infoMarker?.name}</Localized></DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed"><Localized>{info?.definition}</Localized></DialogDescription>
          </DialogHeader>
          {info?.reason && (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground"><Localized>{info.direction === "low" ? "Mögliche Gründe für einen niedrigen Wert" : "Mögliche Gründe für einen hohen Wert"}</Localized></p>
              <p className="leading-relaxed text-muted-foreground"><Localized>{info.reason}</Localized></p>
            </div>
          )}
          <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground"><Localized>Ein einzelner Wert zeigt nicht die Ursache. Bitte besprich auffällige Ergebnisse und den passenden Referenzbereich mit deiner Ärztin oder deinem Arzt.</Localized></p>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

async function shrinkPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("photo"))), "image/jpeg", 0.85));
}
