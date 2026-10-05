import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

function friendly(status: number) {
  if (status === 429) return "Gerade sind zu viele Anfragen. Bitte versuche es gleich noch einmal.";
  if (status === 402 || status === 403) return "Die KI-Funktion ist im Moment nicht verfügbar (Guthaben oder Freigabe fehlt).";
  return "Die KI konnte die Anfrage nicht verarbeiten.";
}

async function askJson(content: unknown[]): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return { ok: false, error: "KI ist nicht konfiguriert." };
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, reasoning: { effort: "low" }, input: [{ role: "user", content }] }),
  });
  if (!res.ok) {
    console.error("AI error", res.status, await res.text().catch(() => ""));
    return { ok: false, error: friendly(res.status) };
  }
  const json: any = await res.json();
  const text: string =
    json.output_text ??
    (json.output ?? []).flatMap((o: any) => o.content ?? []).filter((c: any) => c.type === "output_text").map((c: any) => c.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, error: "Die KI hat keine verwertbare Antwort geliefert." };
  try {
    return { ok: true, data: JSON.parse(match[0]) };
  } catch {
    return { ok: false, error: "Die KI-Antwort konnte nicht gelesen werden." };
  }
}

export type LabReading = { id: string | null; name: string; unit: string; value: number; targetLow: number | null; targetHigh: number | null };
export type PlanItem = { title: string; detail: string };

export const analyzeLabPdf = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ filename: z.string().max(200), base64: z.string().min(100).max(14_000_000), knownIds: z.array(z.string()).max(50) }).parse(d),
  )
  .handler(async ({ data }) => {
    const prompt = `Du liest einen deutschen Laborbefund (Blutwerte). Extrahiere alle Messwerte.
Bekannte Marker-IDs der App: ${data.knownIds.join(", ")} (vitd = Vitamin D 25-OH, ferritin = Ferritin, b12 = Holo-TC/Vitamin B12, omega = Omega-3-Index). Setze "id" auf die passende ID oder null.
Erstelle außerdem 3–6 alltagstaugliche Empfehlungen (Ernährung, Lebensstil, Nachkontrolle) auf Deutsch, du-Form, ohne Diagnose, ohne Medikamente.
Antworte NUR mit JSON in dieser Form:
{"date":"YYYY-MM-DD oder null","markers":[{"id":string|null,"name":string,"unit":string,"value":number,"targetLow":number|null,"targetHigh":number|null}],"plan":[{"title":string,"detail":string}]}`;
    const r = await askJson([
      { type: "input_text", text: prompt },
      { type: "input_file", filename: data.filename || "befund.pdf", file_data: `data:application/pdf;base64,${data.base64}` },
    ]);
    if (!r.ok) return r;
    const markers: LabReading[] = (Array.isArray(r.data.markers) ? r.data.markers : []).filter(
      (m: any) => typeof m?.name === "string" && typeof m?.value === "number",
    );
    const plan: PlanItem[] = (Array.isArray(r.data.plan) ? r.data.plan : []).filter((p: any) => typeof p?.title === "string");
    if (!markers.length) return { ok: false as const, error: "In der PDF wurden keine Laborwerte gefunden." };
    const date = typeof r.data.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.data.date) ? r.data.date : new Date().toISOString().slice(0, 10);
    return { ok: true as const, date, markers, plan };
  });

export const mealFromVoice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ base64: z.string().min(1000).max(14_000_000) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "KI ist nicht konfiguriert." };
    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("file", new File([Buffer.from(data.base64, "base64")], "meal.wav", { type: "audio/wav" }));
    form.append("response_format", "json");
    form.append("language", "de");
    const tr = await fetch(`${GATEWAY}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    if (!tr.ok) {
      console.error("STT error", tr.status, await tr.text().catch(() => ""));
      return { ok: false as const, error: friendly(tr.status) };
    }
    const transcript = String(((await tr.json()) as any).text ?? "").trim();
    if (!transcript) return { ok: false as const, error: "Ich habe nichts verstanden. Bitte noch einmal sprechen." };
    const r = await askJson([
      {
        type: "input_text",
        text: `Jemand beschreibt, was er gegessen hat: "${transcript}"
Teile das in Mahlzeiten auf. Schätze pro Mahlzeit realistisch: protein, kcal, fiber (Ballaststoffe), carbs (Kohlenhydrate), fat (Fett) – jeweils in Gramm bzw. kcal. label ist eine von: Frühstück, Mittagessen, Abendessen, Snack.
Antworte NUR mit JSON: {"meals":[{"label":string,"name":string,"protein":number,"kcal":number,"fiber":number,"carbs":number,"fat":number}]}`,
      },
    ]);
    if (!r.ok) return r;
    const labels = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
    const num = (v: any) => Math.max(0, Math.round(Number(v) || 0));
    const meals = (Array.isArray(r.data.meals) ? r.data.meals : [])
      .filter((m: any) => typeof m?.name === "string")
      .map((m: any) => ({ label: labels.includes(m.label) ? m.label : "Snack", name: m.name.slice(0, 120), protein: num(m.protein), kcal: num(m.kcal), fiber: num(m.fiber), carbs: num(m.carbs), fat: num(m.fat) }));
    if (!meals.length) return { ok: false as const, error: `Verstanden: „${transcript}“ – aber keine Mahlzeit erkannt.` };
    return { ok: true as const, transcript, meals: meals as { label: string; name: string; protein: number; kcal: number; fiber: number; carbs: number; fat: number }[] };
  });

export const mealNutrition = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const r = await askJson([
      {
        type: "input_text",
        text: `Schätze realistische Nährwerte für eine übliche Portion dieser Mahlzeit: "${data.name.replace(/"/g, "'")}".
Antworte NUR mit JSON: {"kcal":number,"protein":number,"fiber":number,"carbs":number,"fat":number} (kcal bzw. Gramm).`,
      },
    ]);
    if (!r.ok) return r;
    const num = (v: any) => Math.max(0, Math.round(Number(v) || 0));
    return { ok: true as const, kcal: num(r.data.kcal), protein: num(r.data.protein), fiber: num(r.data.fiber), carbs: num(r.data.carbs), fat: num(r.data.fat) };
  });
