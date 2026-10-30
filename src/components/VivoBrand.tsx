import logo from "@/assets/fairvitalgo-logo.png.asset.json";

export function VivoBrand({ className = "h-[58px] w-auto object-contain" }: { className?: string }) {
  return <img src={logo.url} width={1130} height={354} alt="fairvitalgo" className={className} />;
}