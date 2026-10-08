import { Localized, useLanguage } from "@/components/Localized";
import { translateText, languageLocale } from "@/lib/language";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { StepsIcon } from "@/components/StepsIcon";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function HourChart({ tone }: { tone: string }) {
  useLanguage();
  return (
    <div className="mt-3">
      <div className="relative flex h-24 items-end gap-[2px] border-b border-border">
        {HOURS.map((h) => (
          <div key={h} className="flex h-full flex-1 items-end border-l border-border/50">
            <div className={`w-full rounded-t-sm ${tone} opacity-30`} style={{ height: "2px" }} />
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-4 text-[10px] text-muted-foreground">
        <span><Localized>{"00"}</Localized></span><span><Localized>{"06"}</Localized></span><span><Localized>{"12"}</Localized></span><span><Localized>{"18"}</Localized></span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground"><Localized>{"Stundenverlauf erscheint, sobald Apple Health oder Google Health Connect verbunden ist."}</Localized></p>
    </div>
  );
}

export function MovementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  useLanguage();
  const { s } = useStore();
  const steps = s.body?.steps ?? null;
  const goal = s.body?.stepGoal ?? 8000;
  const pct = steps != null ? Math.min(1, steps / goal) : 0;
  const r = 52, c = 2 * Math.PI * r;
  const today = new Date().toLocaleDateString(languageLocale(), { weekday: "long", day: "numeric", month: "long" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[88dvh] max-w-[440px] overflow-y-auto rounded-lg border-border bg-card p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[24px] text-foreground"><Localized>{"Bewegung"}</Localized></DialogTitle>
          <DialogDescription className="capitalize"><Localized>{today}</Localized></DialogDescription>
        </DialogHeader>

        <section className="card-surface mt-2 flex items-center gap-5 p-4">
          <svg viewBox="0 0 128 128" className="size-28 shrink-0 -rotate-90" aria-label={translateText("Schritte-Ring")}>
            <circle cx="64" cy="64" r={r} fill="none" strokeWidth="18" className="stroke-trend-move-soft" />
            <circle cx="64" cy="64" r={r} fill="none" strokeWidth="18" strokeLinecap="round"
              className="stroke-trend-move" strokeDasharray={`${pct * c} ${c}`} />
          </svg>
          <div>
            <div className="flex items-center gap-2 text-[15px] text-foreground"><StepsIcon /><Localized>{"Schritte-Ziel"}</Localized></div>
            <div className="text-[24px] font-bold text-trend-move">
              <Localized>{steps != null ? steps.toLocaleString(languageLocale()) : "–"}</Localized><Localized>{"/"}</Localized><Localized>{goal.toLocaleString(languageLocale())}</Localized>
            </div>
            <div className="text-[12px] text-muted-foreground"><Localized>{"Schritte heute"}</Localized></div>
          </div>
        </section>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <section className="card-surface p-4">
            <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground"><StepsIcon /><Localized>{"Schritte"}</Localized></div>
            <div className="text-[12px] text-muted-foreground"><Localized>{"Heute"}</Localized></div>
            <div className="text-[26px] font-bold text-trend-walk"><Localized>{steps != null ? steps.toLocaleString(languageLocale()) : "–"}</Localized></div>
            <HourChart tone="bg-trend-walk" />
          </section>
          <section className="card-surface p-4">
            <div className="text-[15px] font-semibold text-foreground"><Localized>{"Distanz"}</Localized></div>
            <div className="text-[12px] text-muted-foreground"><Localized>{"Heute"}</Localized></div>
            <div className="text-[26px] font-bold text-trend-distance"><Localized>{"–"}</Localized><span className="text-[14px]"><Localized>{" km"}</Localized></span></div>
            <HourChart tone="bg-trend-distance" />
          </section>
        </div>

        <p className="mt-4 rounded-md bg-muted p-3 text-[12px] leading-relaxed text-muted-foreground"><Localized>{" Apple Health und Google Health Connect sind noch nicht verbunden. Bis dahin zeigt Vivo deine selbst eingetragenen Schritte. "}</Localized></p>
        <Link to="/gesundheit" onClick={() => onOpenChange(false)} className="mt-3 block text-center text-[14px] font-semibold text-fv-deep"><Localized>{" Schritte in Gesundheit eintragen → "}</Localized></Link>
      </DialogContent>
    </Dialog>
  );
}
