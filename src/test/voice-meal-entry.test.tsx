import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceMealEntry, type VoiceMeal, type VoiceResult } from "@/components/VoiceMealEntry";
import { MAX_RECORDING_SECONDS, MicError, type Recording } from "@/lib/record-wav";
import { setLanguage } from "@/lib/language";

// jsdom's Blob lacks arrayBuffer(), which WKWebView and browsers provide.
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (this: Blob) {
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

const meal: VoiceMeal ={ label: "Mittagessen", name: "Nudeln mit Hähnchen", kcal: 650, protein: 38, fiber: 5, carbs: 80, fat: 18, drinkMl: 250 };

function setup({ result = { ok: true, transcript: "Mittags Nudeln mit Hähnchen und ein Glas Wasser", meals: [meal] } as VoiceResult, stop = async () => new Blob([new Uint8Array(4096)], { type: "audio/wav" }) } = {}) {
  let onInterrupt: (() => void) | undefined;
  const recording = { sampleRate: 16000, seconds: () => 1, stop: vi.fn<() => Promise<Blob>>(stop), cancel: vi.fn<() => void>() } satisfies Recording;
  const record = vi.fn(async (options?: { onInterrupt?: () => void }) => { onInterrupt = options?.onInterrupt; return recording; });
  const transcribe = vi.fn(async (_base64: string) => result);
  const onConfirm = vi.fn();
  const view = render(<VoiceMealEntry record={record} transcribe={transcribe} onConfirm={onConfirm} />);
  return { view, record, recording, transcribe, onConfirm, interrupt: () => act(() => onInterrupt?.()) };
}
const card = () => screen.getByRole("button", { name: /Erzähl mir|Ich höre zu|Wird verarbeitet|Mikrofon wird gestartet/ });
const startRecording = async () => { fireEvent.click(card()); await screen.findByRole("timer"); };
const setVisibility = (state: "visible" | "hidden") => Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });

describe("Voice meal entry", () => {
  beforeEach(() => setVisibility("visible"));
  afterEach(() => { vi.useRealTimers(); setLanguage("de"); });

  it("explains a denied microphone permission without uploading anything", async () => {
    const { record, transcribe } = setup();
    record.mockRejectedValueOnce(new MicError("denied"));
    fireEvent.click(card());
    expect(await screen.findByRole("alert")).toHaveTextContent("Kein Mikrofonzugriff");
    expect(transcribe).not.toHaveBeenCalled();
    expect(card()).not.toBeDisabled();
  });

  it("records, shows the duration and asks for review before saving", async () => {
    const { recording, transcribe, onConfirm } = setup();
    await startRecording();
    expect(screen.getByRole("timer")).toHaveTextContent("0:00 / 2:00");
    expect(card()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(card());
    expect(await screen.findByText("Erkannte Mahlzeiten – bitte prüfen")).toBeInTheDocument();
    expect(recording.stop).toHaveBeenCalledTimes(1);
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect(transcribe.mock.calls[0]![0]).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(screen.getByText("Nudeln mit Hähnchen")).toBeInTheDocument();
    expect(screen.getByText("250 ml Getränke")).toBeInTheDocument();
    // Nothing is saved until the user confirms.
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    expect(onConfirm).toHaveBeenCalledWith([meal]);
    expect(screen.getByRole("status")).toHaveTextContent("Zum Ernährungstagebuch hinzugefügt.");
  });

  it("ignores rapid repeated taps", async () => {
    const { record, transcribe, onConfirm } = setup();
    fireEvent.click(card());
    fireEvent.click(card());
    await screen.findByRole("timer");
    expect(record).toHaveBeenCalledTimes(1);
    fireEvent.click(card());
    fireEvent.click(card());
    const save = await screen.findByRole("button", { name: "Speichern" });
    expect(transcribe).toHaveBeenCalledTimes(1);
    fireEvent.click(save);
    fireEvent.click(save);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels a recording without uploading or saving it", async () => {
    const { recording, transcribe, onConfirm } = setup();
    await startRecording();
    fireEvent.click(screen.getByRole("button", { name: "Aufnahme abbrechen" }));
    expect(recording.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Aufnahme abgebrochen. Es wurde nichts gespeichert oder gesendet.");
    expect(transcribe).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("lets the user discard the recognized meals", async () => {
    const { onConfirm } = setup();
    await startRecording();
    fireEvent.click(card());
    fireEvent.click(await screen.findByRole("button", { name: "Verwerfen" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText("Nudeln mit Hähnchen")).not.toBeInTheDocument();
  });

  it("stops and discards the recording when the app moves to the background", async () => {
    const { recording, transcribe } = setup();
    await startRecording();
    setVisibility("hidden");
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(recording.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Aufnahme beendet, weil die App in den Hintergrund gewechselt ist.");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("releases the microphone when the view is closed", async () => {
    const { recording, view } = setup();
    await startRecording();
    view.unmount();
    expect(recording.cancel).toHaveBeenCalledTimes(1);
  });

  it("reports a system interruption such as a revoked permission", async () => {
    const { recording, interrupt, transcribe } = setup();
    await startRecording();
    interrupt();
    expect(recording.cancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Die Aufnahme wurde unterbrochen.");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("stops and processes automatically after two minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { recording, transcribe } = setup();
    await startRecording();
    await act(async () => { await vi.advanceTimersByTimeAsync(MAX_RECORDING_SECONDS * 1000 - 1000); });
    expect(recording.stop).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    await waitFor(() => expect(transcribe).toHaveBeenCalledTimes(1));
    expect(recording.stop).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["an empty recording", { stop: async () => { throw new MicError("empty"); } }, "Aufnahme war leer – bitte noch einmal."],
    ["no recognizable speech", { result: { ok: false, error: "Ich habe nichts verstanden. Bitte noch einmal sprechen." } as VoiceResult }, "Keine Sprache erkannt."],
    ["a transcript without a meal", { result: { ok: false, error: "Verstanden: „Hallo“ – aber keine Mahlzeit erkannt." } as VoiceResult }, "Keine Mahlzeit erkannt."],
    ["a backend error", { result: { ok: false, error: "Die KI konnte die Anfrage nicht verarbeiten." } as VoiceResult }, "Die KI konnte die Anfrage nicht verarbeiten."],
  ])("explains %s and saves nothing", async (_case, options, text) => {
    const { onConfirm } = setup(options);
    await startRecording();
    fireEvent.click(card());
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(card()).not.toBeDisabled();
  });

  it("explains a network failure", async () => {
    const { transcribe } = setup();
    transcribe.mockRejectedValueOnce(new TypeError("Load failed"));
    await startRecording();
    fireEvent.click(card());
    expect(await screen.findByRole("alert")).toHaveTextContent("Keine Verbindung.");
  });

  it("shows messages in the selected language", async () => {
    setLanguage("en");
    const { record } = setup();
    record.mockRejectedValueOnce(new MicError("unavailable"));
    fireEvent.click(screen.getByRole("button", { name: /Tell me what you ate|Erzähl mir/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No microphone found.");
  });
});
