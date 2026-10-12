import { useRef, useState } from "react";
import { ArrowRight, Check, ChevronsRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Localized } from "@/components/Localized";
import { translateText } from "@/lib/language";

export function SwipeAction({ label, onComplete, disabled = false, busy = false }: { label: string; onComplete: () => void | Promise<void>; disabled?: boolean; busy?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const update = (value: number) => { progressRef.current = value; setProgress(value); };
  const complete = async () => { if (disabled || busy) return; try { await onComplete(); } finally { update(0); } };
  return <div ref={track} className="swipe-track relative flex h-16 w-full items-center justify-center rounded-full border border-border bg-card text-ink">
    <span className="px-16 text-center text-sm font-bold"><Localized>{busy ? "Bitte warten…" : label}</Localized></span>
    <Check aria-hidden="true" className="absolute right-5 size-5 text-muted-foreground" />
    <Button type="button" size="icon" disabled={disabled || busy} aria-label={translateText(label)} className="swipe-thumb absolute left-1.5 size-[52px] touch-none rounded-full bg-fresh text-ink shadow-none hover:bg-fresh"
      style={{ transform: `translateX(${progress}px)` }}
      onPointerDown={e => { start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (start.current === null) return; const max = Math.max(0, (track.current?.clientWidth ?? 64) - 64); update(Math.max(0, Math.min(max, e.clientX - start.current))); }}
      onPointerUp={() => { const max = Math.max(1, (track.current?.clientWidth ?? 64) - 64); const done = progressRef.current >= max * .8; start.current = null; if (done) void complete(); else update(0); }}
      onPointerCancel={() => { start.current = null; update(0); }}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void complete(); } }}>
      {busy ? <LoaderCircle className="animate-spin" /> : progress > 0 ? <ArrowRight /> : <ChevronsRight />}
    </Button>
  </div>;
}