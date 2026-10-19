import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { ArrowRight, Check, ChevronsRight, LoaderCircle } from "lucide-react";
import { Localized, useLanguage } from "@/components/Localized";
import { translateText } from "@/lib/language";
import { completionHaptic } from "@/lib/haptics";

/** Share of the travel distance after which releasing the thumb completes the action. */
export const SWIPE_COMPLETE_AT = 0.8;
// 52 px thumb plus a 6 px gap on each side of the track.
const THUMB_SPACE = 64;

type Phase = "idle" | "dragging" | "done";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}

/**
 * Drag the thumb to the right to confirm. Pointer users swipe; keyboard, VoiceOver and
 * Switch Control users activate the visually hidden button that carries the same label.
 * With `type="submit"` it submits the surrounding form, so native validation still applies.
 */
export function SwipeAction({ label, onComplete, type = "button", disabled = false, busy = false }: { label: string; onComplete?: () => void | Promise<void>; type?: "button" | "submit"; disabled?: boolean; busy?: boolean }) {
  useLanguage();
  const track = useRef<HTMLDivElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const start = useRef<number | null>(null);
  const progressRef = useRef(0);
  const running = useRef(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pending, setPending] = useState(false);
  const reduced = usePrefersReducedMotion();
  const inactive = disabled || busy;
  const maxTravel = () => Math.max(0, (track.current?.clientWidth ?? THUMB_SPACE) - THUMB_SPACE);
  const move = (value: number) => { progressRef.current = value; setProgress(value); };
  const reset = () => { start.current = null; setPhase("idle"); move(0); };

  // Slide back once the action has finished and the page is no longer busy (validation
  // error, failed sign-in). Successful navigation unmounts the control instead.
  useEffect(() => {
    if (phase !== "done" || pending || busy) return;
    start.current = null;
    progressRef.current = 0;
    setProgress(0);
    setPhase("idle");
  }, [phase, pending, busy]);

  const begin = () => {
    if (running.current || inactive) return false;
    running.current = true;
    setPhase("done");
    move(maxTravel());
    setPending(true);
    completionHaptic();
    return true;
  };
  // Deferred so a form submit started by this activation can mark the page busy first.
  const settle = () => setTimeout(() => { running.current = false; setPending(false); }, 0);
  const run = async () => {
    try {
      if (type === "submit") action.current?.form?.requestSubmit(action.current);
      else await onComplete?.();
    } finally { settle(); }
  };

  const activate = (e: MouseEvent<HTMLButtonElement>) => {
    if (!begin()) { e.preventDefault(); return; }
    // A submit button's own click already submits the form.
    if (type === "submit") settle();
    else void run();
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (inactive || running.current) return;
    start.current = e.clientX;
    setPhase("dragging");
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current === null) return;
    move(Math.max(0, Math.min(maxTravel(), e.clientX - start.current)));
  };
  const onPointerUp = () => {
    if (start.current === null) return;
    start.current = null;
    const max = maxTravel();
    if (max > 0 && progressRef.current >= max * SWIPE_COMPLETE_AT && begin()) void run();
    else reset();
  };

  const idle = phase === "idle" && !inactive;
  const text = busy ? "Bitte warten…" : phase === "done" ? "Geschafft" : label;
  return <div ref={track} data-state={phase} data-motion={reduced ? "reduced" : "full"} data-hint={idle && !reduced ? "" : undefined}
    className="swipe-track relative flex h-16 w-full select-none items-center justify-center overflow-hidden rounded-full border border-border bg-card text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
    <span aria-hidden="true" data-testid="swipe-fill" className="swipe-fill absolute inset-y-0 left-0 rounded-full bg-fresh/25" style={{ width: progress > 0 || phase === "done" ? progress + THUMB_SPACE - 6 : 0 }} />
    <span aria-hidden="true" className="relative flex min-w-0 flex-col items-center px-16 text-center leading-tight">
      <span className="text-sm font-bold"><Localized>{text}</Localized></span>
      {idle && <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground"><Localized>{"Nach rechts wischen"}</Localized><ChevronsRight className="swipe-hint-chevrons size-3.5" /></span>}
    </span>
    <Check aria-hidden="true" className="absolute right-5 size-5 text-muted-foreground" />
    <div aria-hidden="true" data-testid="swipe-thumb" className={`swipe-thumb absolute left-1.5 grid size-[52px] touch-none place-items-center rounded-full bg-fresh text-ink ${inactive ? "opacity-70" : "cursor-grab active:cursor-grabbing"}`}
      style={{ transform: `translateX(${progress}px)` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={reset}>
      {busy ? <LoaderCircle className="animate-spin" /> : phase === "done" ? <Check /> : progress > 0 ? <ArrowRight /> : <ChevronsRight />}
    </div>
    <button ref={action} type={type} disabled={inactive} onClick={activate} className="sr-only">{translateText(label)}</button>
  </div>;
}
