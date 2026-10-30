// Bundled (not CDN) so the logo also renders offline in the iOS app. The artwork is the
// approved fairvitalgo® trademark logo, trimmed to its visible bounds; 1114×338 px stays sharp
// at 3x up to ~370 CSS px wide.
import logo from "@/assets/fairvitalgo-logo.webp";

export function VivoBrand({ className = "h-[58px] w-auto object-contain" }: { className?: string }) {
  return <img src={logo} width={1114} height={338} alt="fairvitalgo" decoding="async" className={className} />;
}
