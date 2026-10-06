import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Camera, Upload, Smile, Meh, Frown, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { fmtDate, status, labMarkers as catalog, type LabMarker } from "@/lib/data";
import { analyzeLabPdf } from "@/lib/ai.functions";
import { blobToBase64 } from "@/lib/record-wav";
import { RangeBar } from "@/components/RangeBar";
import laborLab from "@/assets/labor-lab.jpg.asset.json";

export const Route = createFileRoute("/labor")({
  head: () => ({
    meta: [
      { title: "Laborwerte — Vivo" },
      { name: "description", content: "Laborwerte erfassen, Verlauf verstehen und Nachkontrollen planen." },
      { property: "og:title", content: "Laborwerte — Vivo" },
      { property: "og:description", content: "Deine Blutwerte im Verlauf – verständlich erklärt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Labs,
});

const toneFace: Record<"ok" | "warn" | "severe", LucideIcon> = { ok: Smile, warn: Meh, severe: Frown };
const toneColor: Record<"ok" | "warn" | "severe", string> = { ok: "text-bmi-good", warn: "text-nutrition-near", severe: "text-bmi-bad" };

function Labs() {
  const { s, set } = useStore();
  // New accounts start without lab values; offer the standard markers for manual entry.
  const options: LabMarker[] = [...s.labs, ...catalog.filter((c) => !s.labs.some((l) => l.id === c.id)).map((c) => ({ ...c, history: [] }))];
  const [marker, setMarker] = useState(options[0]?.id ?? "");
  const [value, setValue] = useState("");
  const analyze = useServerFn(analyzeLabPdf);
  const [busy, setBusy] = useState(false);
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

  return (
    <AppShell>
      <PageHeader eyebrow="Labor" title="Deine Laborwerte" sub="Werte erfassen, Verlauf sehen, Nachkontrolle nicht vergessen." image={laborLab.url} imageAlt="Forschende im weißen Kittel arbeiten im Labor an einem Mikroskop" imageOverlay="labor-image-overlay" />
      <div className="space-y-3 px-4 pt-4">
        <label className={`card-surface flex cursor-pointer items-center gap-3 p-5 ${busy ? "opacity-60" : ""}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fv/10 text-fv-deep"><Upload size={20} strokeWidth={2.2} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">{busy ? "Befund wird gelesen…" : "Laborbefund hochladen"}</div>
            <div className="text-[12px] text-ink/45">Die App liest deine Werte aus und erstellt deinen Plan.</div>
          </div>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={busy}
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        <label className={`card-surface flex cursor-pointer items-center gap-3 p-5 ${busy ? "opacity-60" : ""}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fv/10 text-fv-deep"><Camera size={20} strokeWidth={2.2} aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium">Befund fotografieren</div>
            <div className="text-[12px] text-ink/45">Kamera öffnen und deine Blutwerte abfotografieren.</div>
          </div>
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy}
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {(busy || progress === 100) && (
          <div className="card-surface space-y-2 p-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-ink/55">{progress === 100 ? "Fertig – Werte übernommen" : "Befund wird hochgeladen und gelesen…"}</span>
              <span className="font-data text-fv-deep">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-fv/10 [&_[data-slot=progress-indicator]]:bg-fresh" />
          </div>
        )}
        {msg && (
          <div className={`rounded-xl px-4 py-3 text-[13px] ${msg.ok ? "bg-fv/10 text-fv-deep" : "bg-warn/15"}`}>
            {msg.text} {msg.ok && <Link to="/plan" className="font-medium underline">Zum Plan →</Link>}
          </div>
        )}
        {s.labs.map((m) => {
          const last = m.history[m.history.length - 1]!;
          const st = status(m);
          return (
            <div key={m.id} className="card-surface p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="eyebrow">{m.name}</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-data text-[28px] font-medium">{last.value}</span>
                    <span className="font-data text-[13px] text-ink/45">{m.unit}</span>
                  </div>
                  <div className="text-[12px] text-ink/45">Ziel {m.target[0]}–{m.target[1]} · {fmtDate(last.date)}</div>
                </div>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-data text-[12px] uppercase tracking-normal ${st.tone === "ok" ? "bg-fv/10 text-fv-deep" : st.tone === "warn" ? "bg-warn/20 text-ink" : "bg-bmi-bad/10 text-bmi-bad"}`}>
                  {(() => { const Face = toneFace[st.tone]; return <Face size={14} className={toneColor[st.tone]} aria-hidden />; })()}
                  {st.label}
                </span>
              </div>
              <div className="mt-4"><RangeBar marker={m} /></div>
              <p className="mt-3 border-t pt-3 text-[13px] text-ink/55">{m.note} Nachkontrolle in {m.retestWeeks} Wochen.</p>
            </div>
          );
        })}

        <form onSubmit={add} className="card-surface space-y-3 p-5">
          <div className="eyebrow">Neuen Wert eintragen</div>
          <select value={marker} onChange={(e) => setMarker(e.target.value)} className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none">
            {s.labs.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.unit})</option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder="Wert" className="w-full rounded-xl bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button className="w-full rounded-full bg-fresh py-2.5 text-sm font-medium text-ink">Speichern</button>
        </form>

        <p className="px-1 text-[12px] text-ink/40">Hinweis: Vivo stellt keine Diagnosen. Bitte besprich auffällige Werte mit deiner Ärztin oder deinem Arzt. Labor-Anbindung folgt.</p>
      </div>
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
