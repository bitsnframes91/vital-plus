import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", label: "Heute", d: "M3 11l9-8 9 8M5 10v10h14V10" },
  { to: "/ernaehrung", label: "Ernährung", d: "M12 3a9 9 0 1 0 9 9M12 12l4-2M12 3v9" },
  { to: "/gesundheit", label: "Gesundheit", d: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" },
  { to: "/labor", label: "Labor", d: "M9 3v6l-4 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-8V3M8 3h8" },
  { to: "/plan", label: "Plan", d: "M4 6h16M4 12h16M4 18h10" },
] as const;

export function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-mist sm:grid sm:place-items-center sm:p-4">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col overflow-hidden bg-background sm:min-h-[860px] sm:rounded-[28px] sm:ring-1 sm:ring-border">
        <main className="flex-1 pb-28">{children}</main>
        <nav className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[416px] -translate-x-1/2 rounded-[22px] bg-card/90 px-1 py-2 ring-1 ring-border backdrop-blur-md">
          <div className="grid grid-cols-5">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: true }}
                className="flex flex-col items-center gap-1 text-ink/40"
                activeProps={{ className: "text-fv-deep" }}
              >
                <Icon d={t.d} />
                <span className="text-[10px] font-medium">{t.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, right }: { eyebrow: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="relative overflow-hidden bg-ink px-6 pb-10 pt-9">
      <div className="pointer-events-none absolute inset-0 hero-glow" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="font-data text-[10px] uppercase tracking-[0.22em] text-on-ink/40">{eyebrow}</span>
          {right}
        </div>
        <h1 className="mt-4 text-balance text-[30px] font-semibold leading-[1.05] text-on-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-[34ch] text-pretty text-sm text-on-ink/55">{sub}</p>}
      </div>
    </header>
  );
}

export function Sparkbars({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="flex h-[52px] items-end gap-1.5">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-[4px] ${last ? "bg-fv" : i >= values.length - 2 ? "bg-fv/50" : "bg-ink/10"}`}
            style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
