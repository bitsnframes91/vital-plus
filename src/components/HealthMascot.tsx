import { useEffect, useState } from "react";
import mascotAnim from "@/assets/health-mascot-anim.webp.asset.json";
import mascotStill from "@/assets/health-mascot-transparent.png.asset.json";

export function HealthMascot() {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return (
    <div className="health-mascot pointer-events-none absolute" aria-hidden="true">
      <img
        src={reducedMotion ? mascotStill.url : mascotAnim.url}
        alt=""
        className="size-full object-contain"
      />
    </div>
  );
}
