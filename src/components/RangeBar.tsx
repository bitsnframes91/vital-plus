import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import type { LabMarker } from "@/lib/data";

/** Comparison bar: target range band vs. actual value marker. */
export function RangeBar({ marker: m }: { marker: LabMarker }) {
  useLanguage();
  const value = m.history[m.history.length - 1]!.value;
  const [lo, hi] = m.target;
  const max = Math.max(hi * 1.5, value * 1.15);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
  const inRange = value >= lo && value <= hi;
  return (
    <div>
      <div className="relative h-3 rounded-full bg-ink/8">
        <div
          className="absolute inset-y-0 rounded-full bg-fresh/35"
          style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }}
        />
        <div
          className={`absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${inRange ? "bg-fv-deep" : "bg-warn"}`}
          style={{ left: pct(value) }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-data text-[11px] text-ink/45">
        <span><Localized>{"0"}</Localized></span>
        <span className="text-fv-deep"><Localized>{"Ziel "}</Localized><Localized>{lo}</Localized><Localized>{"–"}</Localized><Localized>{hi}</Localized></span>
        <span><Localized>{Math.round(max)}</Localized></span>
      </div>
      <div className="mt-1 font-data text-[12px] text-ink/55"><Localized>{" Dein Wert: "}</Localized><span className={inRange ? "text-fv-deep" : "text-warn"}><Localized>{value}</Localized> <Localized>{m.unit}</Localized></span>
        <Localized>{inRange ? " – im Zielbereich" : value < lo ? " – unter dem Zielbereich" : " – über dem Zielbereich"}</Localized>
      </div>
    </div>
  );
}
