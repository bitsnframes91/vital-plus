# Phase 2B — Voice meal entry on iOS: handoff

Branch: `feature/ios-native-enhancements` · Base: `5ab4f37` · Implementation commit: `948499f`

**Physical iPhone status: NOT tested.** Everything below was built and verified on Windows with unit
tests, the web build and `cap sync ios`. Microphone capture on a real iPhone still has to be checked
on the Mac (steps below).

## What changed

Flow: tap → microphone permission (first time only) → capture → stop → 16 kHz WAV → `mealFromVoice`
(unchanged backend: transcription + meal analysis) → **review** → user taps *Speichern* → meals saved.

- **Recording (`src/lib/record-wav.ts`)**
  - The AudioContext is created inside the user's tap, before the permission prompt, and runs at the
    hardware rate (44.1/48 kHz). Previously it forced a 16 kHz context, which iOS does not reliably
    feed from the microphone, and created it after an `await` (outside the gesture).
  - Audio is downsampled to 16 kHz mono while recording (streaming box-filter average, which also
    acts as the anti-aliasing filter), then written as 16-bit PCM WAV. Memory: ~7.7 MB at 2 min.
  - Capture uses an AudioWorklet (blob-URL module) with a ScriptProcessor fallback.
  - Hard cap of 120 s; recordings under 0.5 s are "empty", peak below ≈ −40 dBFS is "silent" —
    neither is uploaded.
  - Errors are mapped: `denied`, `unsupported`, `unavailable`, `busy`, `empty`, `silent`.
  - `stop()`/`cancel()` stop every track and close the context; a track ending or the context
    leaving `running` (call, Siri, revoked permission) reports an interruption.
- **UI (`src/components/VoiceMealEntry.tsx`, used by `src/routes/ernaehrung.tsx`)**
  - States: ready, starting microphone, recording with `m:ss / 2:00`, processing, review, result.
  - *Aufnahme abbrechen* while recording (nothing sent); *Abbrechen* while processing (result dropped).
  - **New review step**: the old code saved AI-interpreted meals immediately. Meals are now shown
    with the transcript and saved only on *Speichern*; *Verwerfen* discards them.
  - Backgrounding (`visibilitychange`/`pagehide`), unmount and interruptions cancel capture and
    release the microphone. Ref locks prevent double start/stop/save from rapid taps.
  - Clear messages for denied permission (iPhone vs. browser wording), no microphone, microphone
    in use, unsupported device, empty/silent audio, no meal recognized, network failure, backend error.
- **Translations (`src/lib/translations.json`)**: 24 new de/en/es entries, including the backend's
  fixed error texts, which were previously shown untranslated.
- **No backend, native, Info.plist or Capacitor config changes.** `NSMicrophoneUsageDescription`
  already exists and Capacitor grants WebView capture requests after the system prompt.

## Files

| File | Change |
|---|---|
| `src/lib/record-wav.ts` | Rewritten recorder (`startRecording`, `Downsampler`, `MicError`); `encodeWav`/`blobToBase64` kept |
| `src/components/VoiceMealEntry.tsx` | New voice entry component with review step |
| `src/routes/ernaehrung.tsx` | Uses the component; saving logic (meals + drinks → water) unchanged |
| `src/lib/translations.json` | New strings |
| `src/test/record-wav.test.ts` | Resampling, WAV format, permission, cap, empty/silent, cancel, interruption |
| `src/test/voice-meal-entry.test.tsx` | Flow, review, rapid taps, cancel, background, unmount, 2-min auto-stop, errors |
| `docs/ios/PHASE-2B-VOICE-HANDOFF.md` | This document |

## Tests run (Windows, Node/Bun)

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | OK, no changes |
| `bunx tsc --noEmit` | 0 errors |
| `bun run test -- --run` | 33 files, 187 tests passed (32 new) |
| `bun run build` | OK; same warnings as before (3 PWA glob, 1 `inlineDynamicImports`, 21 deprecation notices) |
| `bun run ios:sync` | OK; plugins: app, haptics, status-bar |
| ESLint (changed files) | No new non-formatting findings; repo-wide Prettier debt pre-exists |

## Known limitations

- Not tested on a physical iPhone or in the iOS Simulator (Windows machine).
- The box-filter downsampler damps but does not fully remove content above 8 kHz (~6 dB at 10 kHz);
  speech intelligibility is unaffected, but a proper FIR filter could replace it if needed.
- The `Info.plist` microphone text is German only (no `InfoPlist.strings` for en/es yet).
- Cancelling while *processing* cannot stop an upload already in flight; its result is discarded.
- **Privacy policy is inaccurate (needs approval to change):** `src/lib/privacy-policy.ts` says voice
  input uses the browser's/OS speech recognition. Audio is actually sent to the Vital Plus server and
  transcribed via the Lovable AI Gateway (`google/gemini-3.5-transcribe`), not stored. Suggested
  wording should state that, plus that meals are only saved after confirmation.

## Manual verification on iPhone (required)

Use a physical iPhone (the Simulator's microphone is the Mac's and does not reflect iOS audio routing).

1. Fresh install → Ernährung → tap the voice card → iOS microphone prompt shows the German text.
2. **Deny** → message points to *Einstellungen › Datenschutz & Sicherheit › Mikrofon*; no upload.
3. Allow in Settings → return → record 5–10 s of speech → timer counts → tap to stop → review shows
   transcript and meals → *Speichern* → meals and drink water appear in the diary.
4. Repeat, tap *Verwerfen* → nothing saved. Repeat, *Aufnahme abbrechen* → nothing sent.
5. Record silence for 3 s → "Keine Sprache erkannt"; tap start/stop quickly → "Aufnahme war leer".
6. Start recording, swipe home / lock the screen → back in app: "Aufnahme beendet …", orange
   microphone indicator gone.
7. Start recording, receive a call or trigger Siri → "Die Aufnahme wurde unterbrochen".
8. Let a recording run to 2:00 → stops and processes automatically.
9. Airplane mode → stop a recording → "Keine Verbindung …".
10. Test with AirPods/Bluetooth headset and with the built-in microphone (44.1 vs 48 kHz routes).
11. Navigate away from Ernährung mid-recording → microphone indicator disappears.
12. Check Safari Web Inspector console for errors (no audio or transcript content is logged).

## Continue on macOS

```bash
git clone https://github.com/bitsnframes91/vital-plus.git   # or: git fetch origin
cd vital-plus
git checkout feature/ios-native-enhancements
git pull --ff-only origin feature/ios-native-enhancements
bun install --frozen-lockfile
bunx tsc --noEmit && bun run test -- --run
bun run ios:sync          # builds dist-mobile and syncs ios/
bun run ios:open          # opens Xcode; select a physical iPhone, Run (Debug, automatic signing)
```

Debugging the WebView: iPhone *Settings › Apps › Safari › Advanced › Web Inspector* on, then
Safari on the Mac › *Develop › [iPhone] › localhost*. Do not change signing settings or the release
workflows; a personal development team in Xcode is enough for on-device Debug runs.

## Recommended next phase

Phase 2C — Apple Health (HealthKit): read/write, device-only storage, per-user/device consent,
onboarding for new and existing users, control in *Gesundheitsprofil bearbeiten*. Requires your
approval for the HealthKit capability, entitlements and a regenerated provisioning profile first.

## Git

- Branch: `feature/ios-native-enhancements` (pushed to `origin` only)
- Implementation commit: `948499fa91b4437d42c5ba8dbf4111bcf99ae912` (`feat(ios): improve native voice meal recording reliability`)

## Fix: "Keine Verbindung" on TestFlight (voice upload)

**Root cause.** The app calls `POST https://vital-plus.lovable.app/_serverFn/<mealFromVoice id>`
from `capacitor://localhost`. Production is published from `vital-plus`, which does not contain the
native-origin CORS middleware, so the preflight is answered `403 Forbidden` without
`Access-Control-Allow-Origin` (reproduced with curl on 2026-10-14). WebKit rejects `fetch` with
`TypeError: Load failed`, and the voice card mapped every `TypeError` to "Keine Verbindung". The
request never reached authentication, transcription or the AI Gateway.

A second defect would have appeared once the CORS change was published: the middleware did not send
`Access-Control-Expose-Headers`, so WKWebView could not read `x-tss-serialized` and the server
function client would return the raw serialized payload instead of the result. Fixed in
`src/lib/native-cors.ts`.

**Backend deployment required.** `src/start.ts` + `src/lib/native-cors.ts` must be merged into the
Lovable branch and published before voice (and every other server function) works on iOS. Check after
publishing:

```sh
curl -si -X OPTIONS https://vital-plus.lovable.app/_serverFn/x -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" | grep -iE "^HTTP|access-control"
# expect: 204, Access-Control-Allow-Origin: capacitor://localhost, Access-Control-Expose-Headers: x-tss-serialized, x-tss-raw
```

**Client.** `src/lib/server-fetch.ts` classifies failures: offline, server unreachable (online but no
response, which includes a CORS rejection), timeout (90 s client limit or WebKit's ~60 s), 401 / expired
session, 403, 404, 413, 429 and 5xx, each with its own message. Cancelling now aborts the upload in
flight and sends nothing if the audio is still being encoded.

**Diagnostics** (Safari Web Inspector): `[server-fn]` lines (function id prefix, status, duration,
online flag) and `[voice]` lines (audio size in KB, duration, outcome category, meal count). No
tokens, URLs with query strings, audio, transcripts or meal contents are logged.
