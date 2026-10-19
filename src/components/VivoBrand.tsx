// Bundled (not CDN) so the logo also renders offline in the iOS app. The artwork is the
// approved Vital Plus logo, trimmed to its visible bounds; 1178×624 px stays sharp at 3x
// up to ~390 CSS px wide.
import logo from "@/assets/vital-plus-logo.webp";

export function VivoBrand({ className = "h-[52px] w-auto object-contain" }: { className?: string }) {
  return <img src={logo} width={1178} height={624} alt="Vital Plus" decoding="async" className={className} />;
}
