import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Localized, useLanguage } from "@/components/Localized";
import { Button } from "@/components/ui/button";
import type { Meal } from "@/lib/data";
import { isNativeApp } from "@/lib/native-app";
import { blobToBase64, MAX_RECORDING_SECONDS, MicError, micErrorFrom, startRecording, type MicErrorCode, type Recording } from "@/lib/record-wav";
import voiceCardBg from "@/assets/voice-card-bg.png";

export type VoiceMeal = Omit<Meal, "id" | "time" | "date"> & { drinkMl?: number | undefined };
export type VoiceResult = { ok: true; transcript: string; meals: VoiceMeal[] } | { ok: false; error: string };

type Phase = "idle" | "starting" | "recording" | "processing" | "review";
type NoticeKind = MicErrorCode | "noMeal" | "network" | "failed" | "cancelled" | "background" | "interrupted" | "discarded" | "saved";
type Notice = { text: string; alert: boolean };

const messages: Record<NoticeKind, string> = {
  denied: isNativeApp
    ? "Kein Mikrofonzugriff. Bitte erlaube den Zugriff in den iPhone-Einstellungen unter Datenschutz & Sicherheit › Mikrofon."
    : "Kein Mikrofonzugriff. Bitte erlaube den Zugriff in den Browser-Einstellungen.",
  unsupported: "Spracheingabe wird auf diesem Gerät nicht unterstützt.",
  unavailable: "Kein Mikrofon gefunden.",
  busy: "Das Mikrofon wird gerade von einer anderen App verwendet.",
  empty: "Aufnahme war leer – bitte noch einmal.",
  silent: "Keine Sprache erkannt. Bitte sprich etwas lauter und versuche es erneut.",
  noMeal: "Keine Mahlzeit erkannt. Bitte beschreibe, was du gegessen hast.",
  network: "Keine Verbindung. Bitte prüfe deine Internetverbindung und versuche es erneut.",
  failed: "Aufnahme fehlgeschlagen.",
  cancelled: "Aufnahme abgebrochen. Es wurde nichts gespeichert oder gesendet.",
  background: "Aufnahme beendet, weil die App in den Hintergrund gewechselt ist. Es wurde nichts gesendet.",
  interrupted: "Die Aufnahme wurde unterbrochen. Es wurde nichts gesendet.",
  discarded: "Verworfen. Es wurde nichts gespeichert.",
  saved: "Zum Ernährungstagebuch hinzugefügt.",
};
const info = new Set<NoticeKind>(["cancelled", "discarded", "saved"]);
const notice = (kind: NoticeKind): Notice => ({ text: messages[kind], alert: !info.has(kind) });

// Fixed backend messages that have a clearer client-side equivalent.
function serverNotice(error: string): Notice {
  if (error.startsWith("Ich habe nichts verstanden")) return notice("silent");
  if (error.startsWith("Verstanden:")) return notice("noMeal");
  return { text: error, alert: true };
}
const isNetworkError = (error: unknown) => (typeof navigator !== "undefined" && navigator.onLine === false) || error instanceof TypeError;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * Voice meal entry: record → transcribe and analyse on the server → review → save.
 * Audio is only sent after the user stops a recording they started, and meals are only
 * saved after the user confirms the review.
 */
export function VoiceMealEntry({ transcribe, onConfirm, record = startRecording }: {
  transcribe: (base64Wav: string) => Promise<VoiceResult>;
  onConfirm: (meals: VoiceMeal[]) => void;
  record?: typeof startRecording;
}) {
  useLanguage();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<Notice | null>(null);
  const [review, setReview] = useState<{ transcript: string; meals: VoiceMeal[] } | null>(null);
  const recording = useRef<Recording | null>(null);
  const startedAt = useRef(0);
  // A start, stop or save is in flight: rapid taps are ignored.
  const busy = useRef(false);
  // Bumped by cancel, backgrounding and unmount so late results of an older session are dropped.
  const session = useRef(0);
  const pendingReview = useRef<VoiceMeal[] | null>(null);

  const abort = (kind: NoticeKind) => {
    session.current++;
    recording.current?.cancel();
    recording.current = null;
    busy.current = false;
    setPhase("idle");
    setElapsed(0);
    setMessage(notice(kind));
  };

  const start = async () => {
    if (busy.current || recording.current) return;
    busy.current = true;
    const id = ++session.current;
    setMessage(null);
    setPhase("starting");
    try {
      const rec = await record({ onInterrupt: () => { if (session.current === id) abort("interrupted"); } });
      if (session.current !== id) { rec.cancel(); return; }
      if (document.visibilityState === "hidden") { rec.cancel(); abort("background"); return; }
      recording.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase("recording");
    } catch (error) {
      if (session.current !== id) return;
      setPhase("idle");
      setMessage(notice(micErrorFrom(error).code));
    } finally {
      if (session.current === id) busy.current = false;
    }
  };

  const finish = async () => {
    const rec = recording.current;
    if (!rec || busy.current) return;
    busy.current = true;
    recording.current = null;
    const id = session.current;
    setPhase("processing");
    try {
      const base64 = await blobToBase64(await rec.stop());
      let result: VoiceResult;
      try {
        result = await transcribe(base64);
      } catch (error) {
        // Only failures of the upload itself count as connection problems.
        if (session.current !== id) return;
        setPhase("idle");
        setMessage(notice(isNetworkError(error) ? "network" : "failed"));
        return;
      }
      if (session.current !== id) return;
      if (!result.ok) { setPhase("idle"); setMessage(serverNotice(result.error)); return; }
      if (!result.meals.length) { setPhase("idle"); setMessage(notice("noMeal")); return; }
      pendingReview.current = result.meals;
      setReview({ transcript: result.transcript, meals: result.meals });
      setPhase("review");
    } catch (error) {
      if (session.current !== id) return;
      setPhase("idle");
      setMessage(notice(error instanceof MicError ? error.code : "failed"));
    } finally {
      if (session.current === id) busy.current = false;
    }
  };

  const confirm = () => {
    const meals = pendingReview.current;
    if (!meals) return;
    pendingReview.current = null;
    onConfirm(meals);
    setReview(null);
    setPhase("idle");
    setMessage(notice("saved"));
  };
  const discard = () => {
    pendingReview.current = null;
    setReview(null);
    setPhase("idle");
    setMessage(notice("discarded"));
  };

  // Elapsed time and the 2-minute limit, which stops and processes the recording.
  useEffect(() => {
    if (phase !== "recording") return;
    const tick = setInterval(() => {
      const seconds = Math.min(MAX_RECORDING_SECONDS, (Date.now() - startedAt.current) / 1000);
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SECONDS) void finish();
    }, 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Leaving the app or the page always ends capture and releases the microphone.
  const abortRef = useRef(abort);
  abortRef.current = abort;
  useEffect(() => {
    // The latest session must be invalidated on unmount, so the ref itself is kept, not its value.
    const sessions = session;
    const onHide = () => { if (document.visibilityState === "hidden" && recording.current) abortRef.current("background"); };
    const onPageHide = () => { if (recording.current) abortRef.current("background"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      sessions.current++;
      recording.current?.cancel();
      recording.current = null;
    };
  }, []);

  const recordingNow = phase === "recording";
  const title = phase === "starting" ? "Mikrofon wird gestartet…" : recordingNow ? "Ich höre zu… tippen zum Beenden" : phase === "processing" ? "Wird verarbeitet…" : "Erzähl mir, was du gegessen hast";
  const drinkMl = review?.meals.reduce((sum, meal) => sum + (meal.drinkMl ?? 0), 0) ?? 0;

  return <div className="space-y-3" data-voice-phase={phase}>
    <button type="button" onClick={() => void (recordingNow ? finish() : start())} disabled={phase === "starting" || phase === "processing" || phase === "review"}
      aria-pressed={recordingNow}
      className={`card-surface relative w-full overflow-hidden text-left disabled:opacity-60 ${recordingNow ? "ring-2 ring-fv" : ""}`}>
      <span aria-hidden className="absolute inset-y-0 right-0 w-[48%]">
        <img src={voiceCardBg} alt="" loading="lazy" width={1200} height={640} className="size-full object-cover object-[65%_center]" />
        <span className="absolute inset-0 bg-gradient-to-r from-card via-card/70 to-card/20" />
      </span>
      <span className="relative z-10 flex items-center gap-3 p-5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full bg-fresh text-ink ${recordingNow ? "animate-pulse motion-reduce:animate-none" : ""}`}>
          {phase === "processing" || phase === "starting"
            ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
            : <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium"><Localized>{title}</Localized></div>
          {recordingNow
            ? <div className="font-data text-[12px] text-ink/60" role="timer" aria-live="off"><Localized>{clock(elapsed)}</Localized><Localized>{" / "}</Localized><Localized>{clock(MAX_RECORDING_SECONDS)}</Localized><span className="sr-only"> <Localized>{"Aufnahmedauer"}</Localized></span></div>
            : <div className="text-[12px] text-ink/45"><Localized>{"z. B. „Mittags hatte ich Nudeln mit Hähnchen und einen Apfel“"}</Localized></div>}
        </div>
      </span>
    </button>

    {(recordingNow || phase === "processing") && (
      <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => abort(recordingNow ? "cancelled" : "discarded")}>
        <Localized>{recordingNow ? "Aufnahme abbrechen" : "Abbrechen"}</Localized>
      </Button>
    )}

    {review && (
      <section className="card-surface space-y-3 p-4" aria-labelledby="voice-review-title" data-voice-review>
        <h2 id="voice-review-title" className="eyebrow"><Localized>{"Erkannte Mahlzeiten – bitte prüfen"}</Localized></h2>
        <p className="text-[13px] italic text-ink/60">„{review.transcript}“</p>
        <ul className="divide-y divide-border">
          {review.meals.map((meal, index) => (
            <li key={index} className="py-2">
              <div className="font-data text-[12px] uppercase tracking-normal text-fv-deep"><Localized>{meal.label}</Localized></div>
              <div className="text-[15px] font-medium">{meal.name}</div>
              <div className="font-data text-[12px] text-ink/45"><Localized>{meal.kcal}</Localized><Localized>{" kcal · "}</Localized><Localized>{meal.protein}</Localized><Localized>{" g Protein · "}</Localized><Localized>{meal.carbs}</Localized><Localized>{" g KH · "}</Localized><Localized>{meal.fat}</Localized><Localized>{" g Fett"}</Localized></div>
            </li>
          ))}
        </ul>
        {drinkMl > 0 && <p className="text-[13px] text-ink/70"><Localized>{`${Math.round(drinkMl)} ml Getränke`}</Localized></p>}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={discard}><Localized>{"Verwerfen"}</Localized></Button>
          <Button type="button" className="rounded-full bg-fresh text-ink hover:bg-fresh" onClick={confirm}><Localized>{"Speichern"}</Localized></Button>
        </div>
      </section>
    )}

    {message && <p role={message.alert ? "alert" : "status"} className="rounded-xl bg-muted px-4 py-3 text-[13px] text-ink/70"><Localized>{message.text}</Localized></p>}
  </div>;
}
