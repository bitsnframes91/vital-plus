import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Downsampler, encodeWav, MAX_RECORDING_SECONDS, MicError, micErrorFrom, startRecording, TARGET_SAMPLE_RATE } from "@/lib/record-wav";

const sine = (hz: number, rate: number, seconds: number, amplitude = 0.5) =>
  Float32Array.from({ length: Math.round(rate * seconds) }, (_, i) => amplitude * Math.sin((2 * Math.PI * hz * i) / rate));
const crossings = (samples: Float32Array) => samples.reduce((n, v, i) => (i > 0 && samples[i - 1]! < 0 && v >= 0 ? n + 1 : n), 0);
const readBlob = (blob: Blob) => new Promise<ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error);
  reader.readAsArrayBuffer(blob);
});
async function parseWav(blob: Blob) {
  const view = new DataView(await readBlob(blob));
  const text = (offset: number) => String.fromCharCode(...Array.from({ length: 4 }, (_, i) => view.getUint8(offset + i)));
  const dataBytes = view.getUint32(40, true);
  return {
    riff: text(0), riffSize: view.getUint32(4, true), wave: text(8), fmt: text(12), fmtSize: view.getUint32(16, true),
    format: view.getUint16(20, true), channels: view.getUint16(22, true), sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true), blockAlign: view.getUint16(32, true), bits: view.getUint16(34, true),
    data: text(36), dataBytes, totalBytes: view.byteLength,
    samples: Int16Array.from({ length: dataBytes / 2 }, (_, i) => view.getInt16(44 + i * 2, true)),
  };
}

describe("Downsampler", () => {
  it.each([48000, 44100])("converts %i Hz speech-band audio to 16 kHz without changing pitch", (rate) => {
    const input = sine(440, rate, 1);
    const half = input.length >> 1;
    const downsampler = new Downsampler(rate);
    // Streaming in two uneven blocks must match one continuous signal.
    const out = new Float32Array([...downsampler.push(input.subarray(0, half - 7)), ...downsampler.push(input.subarray(half - 7))]);
    expect(downsampler.outputRate).toBe(TARGET_SAMPLE_RATE);
    expect(Math.abs(out.length - TARGET_SAMPLE_RATE)).toBeLessThanOrEqual(1);
    expect(Math.abs(crossings(out) - 440)).toBeLessThanOrEqual(1);
    const peak = Math.max(...out.map(Math.abs));
    expect(peak).toBeGreaterThan(0.48);
    expect(peak).toBeLessThanOrEqual(0.5);
  });

  it("damps content above the 8 kHz limit of the 16 kHz output", () => {
    const out = new Downsampler(48000).push(sine(12000, 48000, 0.25));
    expect(Math.max(...out.map(Math.abs))).toBeLessThan(0.2);
  });

  it("passes audio at or below 16 kHz through unchanged", () => {
    const input = sine(300, 16000, 0.1);
    const downsampler = new Downsampler(16000);
    expect(downsampler.outputRate).toBe(16000);
    expect(downsampler.push(input)).toEqual(input);
  });
});

describe("encodeWav", () => {
  it("writes a valid 16-bit mono PCM WAV and clamps out-of-range samples", async () => {
    const wav = await parseWav(encodeWav([new Float32Array([0, 0.5, -0.5]), new Float32Array([2, -2])], 16000));
    expect(wav).toMatchObject({ riff: "RIFF", wave: "WAVE", fmt: "fmt ", fmtSize: 16, format: 1, channels: 1, sampleRate: 16000, byteRate: 32000, blockAlign: 2, bits: 16, data: "data", dataBytes: 10, totalBytes: 54, riffSize: 46 });
    expect(Array.from(wav.samples)).toEqual([0, 16383, -16384, 32767, -32768]);
  });
});

describe("micErrorFrom", () => {
  it.each([
    ["NotAllowedError", "denied"], ["SecurityError", "unsupported"], ["NotFoundError", "unavailable"],
    ["NotReadableError", "busy"], ["OverconstrainedError", "unavailable"],
  ])("maps %s to %s", (name, code) => {
    expect(micErrorFrom(Object.assign(new Error("x"), { name })).code).toBe(code);
  });
});

// Minimal Web Audio + getUserMedia doubles that drive the ScriptProcessor capture path.
class FakeTrack { stopped = false; onended: (() => void) | null = null; stop() { this.stopped = true; } }
class FakeStream { track = new FakeTrack(); getTracks() { return [this.track]; } getAudioTracks() { return [this.track]; } }
class FakeNode { connect = vi.fn(); disconnect = vi.fn(); }
class FakeProcessor extends FakeNode { onaudioprocess: ((event: { inputBuffer: { getChannelData: () => Float32Array } }) => void) | null = null; }
class FakeContext {
  static last: FakeContext;
  sampleRate = 48000;
  state = "suspended";
  closed = false;
  onstatechange: (() => void) | null = null;
  destination = {};
  processor = new FakeProcessor();
  constructor() { FakeContext.last = this; }
  resume() { this.state = "running"; return Promise.resolve(); }
  close() { this.closed = true; this.state = "closed"; return Promise.resolve(); }
  createMediaStreamSource() { return new FakeNode(); }
  createGain() { return Object.assign(new FakeNode(), { gain: { value: 1 } }); }
  createScriptProcessor() { return this.processor; }
  feed(samples: Float32Array) {
    for (let i = 0; i < samples.length; i += 4096) {
      const block = samples.subarray(i, i + 4096);
      this.processor.onaudioprocess?.({ inputBuffer: { getChannelData: () => block } });
    }
  }
}

describe("startRecording", () => {
  let stream: FakeStream;
  const getUserMedia = vi.fn();
  beforeEach(() => {
    stream = new FakeStream();
    getUserMedia.mockReset().mockImplementation(async () => stream);
    vi.stubGlobal("AudioContext", FakeContext);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  });

  it("reports a denied permission and leaves nothing running", async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    await expect(startRecording()).rejects.toMatchObject({ code: "denied" });
    expect(FakeContext.last.closed).toBe(true);
  });

  it("reports unsupported devices without asking for the microphone", async () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    await expect(startRecording()).rejects.toBeInstanceOf(MicError);
    await expect(startRecording()).rejects.toMatchObject({ code: "unsupported" });
  });

  it("records 48 kHz input as 16 kHz WAV and releases the microphone", async () => {
    const recording = await startRecording();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: expect.objectContaining({ channelCount: 1 }) });
    FakeContext.last.feed(sine(220, 48000, 1));
    expect(recording.seconds()).toBeCloseTo(1, 1);
    const wav = await parseWav(await recording.stop());
    expect(wav.sampleRate).toBe(16000);
    expect(Math.abs(wav.samples.length - 16000)).toBeLessThanOrEqual(1);
    expect(stream.track.stopped).toBe(true);
    expect(FakeContext.last.closed).toBe(true);
  });

  it("caps a recording at the maximum duration", async () => {
    const recording = await startRecording();
    for (let s = 0; s < MAX_RECORDING_SECONDS + 5; s += 5) FakeContext.last.feed(sine(220, 48000, 5));
    expect(recording.seconds()).toBe(MAX_RECORDING_SECONDS);
    const wav = await parseWav(await recording.stop());
    expect(wav.samples.length).toBe(MAX_RECORDING_SECONDS * 16000);
  });

  it("rejects empty and silent recordings instead of uploading them", async () => {
    const short = await startRecording();
    FakeContext.last.feed(sine(220, 48000, 0.2));
    await expect(short.stop()).rejects.toMatchObject({ code: "empty" });
    const silent = await startRecording();
    FakeContext.last.feed(new Float32Array(48000));
    await expect(silent.stop()).rejects.toMatchObject({ code: "silent" });
  });

  it("discards audio on cancel and ignores input afterwards", async () => {
    const recording = await startRecording();
    FakeContext.last.feed(sine(220, 48000, 1));
    recording.cancel();
    expect(stream.track.stopped).toBe(true);
    expect(FakeContext.last.closed).toBe(true);
    FakeContext.last.feed(sine(220, 48000, 1));
    await expect(recording.stop()).rejects.toMatchObject({ code: "empty" });
  });

  it("reports when the system ends the microphone track", async () => {
    const onInterrupt = vi.fn();
    await startRecording({ onInterrupt });
    stream.track.onended?.();
    expect(onInterrupt).toHaveBeenCalledTimes(1);
  });
});
