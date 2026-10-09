import logo from "@/assets/vital-plus-logo.png.asset.json";

export function VivoBrand() {
  return <img src={logo.url} width={140} height={58} alt="Vital Plus" className="h-[58px] w-auto object-contain" />;
}