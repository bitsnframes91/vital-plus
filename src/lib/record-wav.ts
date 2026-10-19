// Browser-only microphone capture for voice meal entry. Records mono audio at the device's own
// rate (iPhones run at 44.1 or 48 kHz), downsamples it to 16 kHz while recording and returns a
// complete 16-bit PCM WAV file. Audio stays in memory; nothing is uploaded from here.

export const TARGET_SAMPLE_RATE = 16000;
export const MAX_RECORDING_SECONDS = 120;
const MIN_RECORDING_SECONDS = 0.5;
/** Peak level below which a recording is treated as silence (about −40 dBFS). */
const SILENCE_PEAK = 0.01;

export type MicErrorCode = "unsupported" | "denied" | "unavailable" | "busy" | "empty" | "silent";
export class MicError extends Error {
  constructor(readonly code: MicErrorCode) {
    super(code);
    this.name = "MicError";
  }
}

/** Maps getUserMedia / Web Audio failures to the cases the interface explains. */
export function micErrorFrom(error: unknown): MicError {
  if (error instanceof MicError) return error;
  const name = (error as { name?: unknown } | null)?.name;
  if (name === "NotAllowedError" || name === "PermissionDeniedError") return new MicError("denied");
  if (name === "SecurityError") return new MicError("unsupported");
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError")
    return new MicError("busy");
  return new MicError("unavailable");
}

export function encodeWav(chunks: readonly Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new ArrayBuffer(44 + length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, length * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const value of chunk) {
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample * (sample < 0 ? 32768 : 32767), true);
      offset += 2;
    }
  return new Blob([bytes], { type: "audio/wav" });
}

/**
 * Streaming downsampler. Each output sample is the average of the input span it covers
 * (fractional samples weighted), which doubles as the anti-aliasing low-pass filter.
 * Input at or below the target rate passes through unchanged.
 */
export class Downsampler {
  private readonly ratio: number;
  private index = 0;
  private edge: number;
  private sum = 0;
  private weight = 0;

  constructor(
    readonly inputRate: number,
    readonly targetRate = TARGET_SAMPLE_RATE,
  ) {
    this.ratio = inputRate > targetRate ? inputRate / targetRate : 1;
    this.edge = this.ratio;
  }

  get outputRate() {
    return this.ratio === 1 ? this.inputRate : this.targetRate;
  }

  push(input: Float32Array): Float32Array {
    if (this.ratio === 1) return input.slice();
    const out = new Float32Array(Math.ceil(input.length / this.ratio) + 1);
    let n = 0;
    for (const x of input) {
      const end = this.index + 1;
      if (end < this.edge) {
        this.sum += x;
        this.weight += 1;
      } else {
        const part = this.edge - this.index;
        this.sum += x * part;
        this.weight += part;
        out[n++] = this.sum / this.weight;
        this.sum = x * (1 - part);
        this.weight = 1 - part;
        this.edge += this.ratio;
      }
      this.index = end;
    }
    return out.slice(0, n);
  }
}

export function peakLevel(chunks: readonly Float32Array[]): number {
  let peak = 0;
  for (const chunk of chunks) for (const value of chunk) peak = Math.max(peak, Math.abs(value));
  return peak;
}

export interface Recording {
  /** Sample rate of the WAV that stop() returns. */
  readonly sampleRate: number;
  /** Seconds captured so far; capture ends by itself at MAX_RECORDING_SECONDS. */
  seconds(): number;
  /** Ends capture, releases the microphone and returns the WAV. Rejects with MicError for empty or silent audio. */
  stop(): Promise<Blob>;
  /** Ends capture, releases the microphone and discards the audio. */
  cancel(): void;
}

// Collects 2048-frame blocks on the audio thread, so the main thread gets ~23 messages/s at 48 kHz.
const CAPTURE_WORKLET = `class VitalPlusCapture extends AudioWorkletProcessor {
  constructor() { super(); this.block = new Float32Array(2048); this.filled = 0; }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    let read = 0;
    while (read < channel.length) {
      const count = Math.min(channel.length - read, this.block.length - this.filled);
      this.block.set(channel.subarray(read, read + count), this.filled);
      this.filled += count; read += count;
      if (this.filled === this.block.length) { this.port.postMessage(this.block, [this.block.buffer]); this.block = new Float32Array(2048); this.filled = 0; }
    }
    return true;
  }
}
registerProcessor("vital-plus-capture", VitalPlusCapture);`;

async function captureNode(
  ctx: AudioContext,
  onSamples: (samples: Float32Array) => void,
): Promise<AudioNode> {
  if (ctx.audioWorklet && typeof AudioWorkletNode !== "undefined") {
    const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "text/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
      const node = new AudioWorkletNode(ctx, "vital-plus-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: "explicit",
      });
      node.port.onmessage = (event: MessageEvent<Float32Array>) => onSamples(event.data);
      return node;
    } catch {
      // Older WebKit or a blocked module URL: use the ScriptProcessor fallback below.
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const node = ctx.createScriptProcessor(4096, 1, 1);
  node.onaudioprocess = (event) => onSamples(new Float32Array(event.inputBuffer.getChannelData(0)));
  return node;
}

/**
 * Starts microphone capture. Call it directly from the user's tap: the AudioContext is created
 * before the permission prompt so iOS still counts it as user-initiated.
 * `onInterrupt` fires if the system ends capture (permission revoked, phone call, device lost).
 */
export async function startRecording({
  onInterrupt,
}: { onInterrupt?: () => void } = {}): Promise<Recording> {
  const AudioCtx =
    typeof window === "undefined"
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!AudioCtx || !navigator.mediaDevices?.getUserMedia) throw new MicError("unsupported");
  // Hardware rate on purpose: iOS does not reliably feed a microphone into a 16 kHz context.
  const ctx = new AudioCtx();
  const closeContext = () => {
    ctx.onstatechange = null;
    void ctx.close().catch(() => {});
  };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (error) {
    closeContext();
    throw micErrorFrom(error);
  }

  const downsampler = new Downsampler(ctx.sampleRate);
  const rate = downsampler.outputRate;
  const maxFrames = MAX_RECORDING_SECONDS * rate;
  const chunks: Float32Array[] = [];
  let frames = 0;
  let finished = false;
  let disconnect = () => {};
  const shutdown = () => {
    if (finished) return false;
    finished = true;
    for (const track of stream.getTracks()) {
      track.onended = null;
      track.stop();
    }
    disconnect();
    closeContext();
    return true;
  };

  try {
    await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    // Silent sink keeps the capture node pulled without playing the microphone back.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    sink.connect(ctx.destination);
    const node = await captureNode(ctx, (samples) => {
      if (finished || frames >= maxFrames) return;
      let out = downsampler.push(samples);
      if (frames + out.length > maxFrames) out = out.slice(0, maxFrames - frames);
      frames += out.length;
      if (out.length) chunks.push(out);
    });
    source.connect(node);
    node.connect(sink);
    disconnect = () => {
      source.disconnect();
      node.disconnect();
      sink.disconnect();
    };
  } catch (error) {
    shutdown();
    throw micErrorFrom(error);
  }

  const interrupted = () => {
    if (!finished) onInterrupt?.();
  };
  for (const track of stream.getAudioTracks()) track.onended = interrupted;
  ctx.onstatechange = () => {
    if (ctx.state !== "running") interrupted();
  };

  return {
    sampleRate: rate,
    seconds: () => frames / rate,
    async stop() {
      if (!shutdown()) throw new MicError("empty");
      if (frames < MIN_RECORDING_SECONDS * rate) throw new MicError("empty");
      if (peakLevel(chunks) < SILENCE_PEAK) throw new MicError("silent");
      return encodeWav(chunks, rate);
    },
    cancel() {
      shutdown();
      chunks.length = 0;
    },
  };
}

export async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000)
    s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
