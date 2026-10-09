import logo from "@/assets/vital-plus-logo.png.asset.json";

export function VivoBrand() {
  return <img src={logo.url} width={110} height={58} alt="Vital Plus" className="h-[58px] w-[110px] object-contain" />;
}