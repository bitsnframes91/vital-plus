import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Salad, HeartPulse, FlaskConical, ClipboardList, UserRound } from "lucide-react";
import { ConfirmBanner } from "./ConfirmBanner";

const tabs = [
  { to: "/heute", label: "Heute", d: "M3 11l9-8 9 8M5 10v10h14V10" },
  { to: "/ernaehrung", label: "Ernährung", d: "M12 3a9 9 0 1 0 9 9M12 12l4-2M12 3v9" },
  { to: "/gesundheit", label: "Gesundheit", d: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" },
  { to: "/labor", label: "Labor", d: "M9 3v6l-4 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-8V3M8 3h8" },
  { to: "/plan", label: "Plan", d: "M9 4h6M9 2h6v4H9zM7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M7 12l2 2 4-4M7 18h10" },
  { to: "/profil", label: "Einstellungen", d: "M4 6h16M4 12h16M4 18h10" },
] as const;

export function Icon({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navIcons = [Home, Salad, HeartPulse, FlaskConical, ClipboardList, UserRound];
  const pathname = useLocation({ select: (s) => s.pathname });
  return (
    <div className="min-h-screen w-full bg-mist sm:grid sm:place-items-start sm:p-4">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col overflow-hidden bg-background sm:h-[calc(100dvh-2rem)] sm:min-h-0 sm:rounded-[28px] sm:ring-1 sm:ring-border">
        <main className="flex-1 pb-28 sm:min-h-0 sm:overflow-y-auto"><ConfirmBanner />{children}</main>
        <nav aria-label="Hauptnavigation" className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-5 pt-3 backdrop-blur-md sm:absolute">
          <div className="grid grid-cols-6">
            {tabs.map((t, i) => {
              const NavIcon = navIcons[i];
              return (
              <Link
                key={t.to}
                to={t.to}
                activeOptions={{ exact: true }}
                className={({ isActive }) => `flex min-w-0 flex-col items-center gap-1 ${isActive ? "text-fresh" : "text-ink/40"}`}
              >
                {NavIcon && <NavIcon className="size-5" strokeWidth={1.7} />}
                <span className="text-[9px] font-medium">{t.to === "/profil" ? "Profil" : t.label}</span>
              </Link>
            ); })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, right, image, imageAlt, imageOverlay = "page-image-overlay", subClass = "max-w-[34ch]" }: { eyebrow: string; title: string; sub?: string; right?: ReactNode; image?: string; imageAlt?: string; imageOverlay?: string; subClass?: string }) {
  return (
    <header className="relative overflow-hidden bg-header px-6 pb-10 pt-9">
      {image && (
        <>
          <img src={image} alt={imageAlt ?? ""} aria-hidden={!imageAlt} className="absolute inset-0 size-full object-cover object-center" />
          <div className={`${imageOverlay} absolute inset-0`} aria-hidden="true" />
        </>
      )}
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="font-data text-[12px] uppercase tracking-normal text-fv-deep">{eyebrow}</span>
          {right}
        </div>
        <h1 className="mt-4 text-balance text-[29px] font-bold leading-[1.15] text-foreground">{title}</h1>
        {sub && <p className={`mt-2 ${subClass} text-pretty text-sm text-muted-foreground`}>{sub}</p>}
      </div>
    </header>
  );
}

export function Sparkbars({ values, max }: { values: number[]; max: number }) {
  const scale = Math.max(1, max, ...values.filter(Number.isFinite));
  return (
    <div className="flex h-[52px] items-end gap-1.5 overflow-hidden">
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-[4px] ${last ? "bg-fv" : i >= values.length - 2 ? "bg-fv/50" : "bg-ink/10"}`}
            style={{ height: `${Number.isFinite(v) ? Math.min(100, Math.max(12, (v / scale) * 100)) : 12}%` }}
          />
        );
      })}
    </div>
  );
}
