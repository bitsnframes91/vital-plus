import { useEffect, useState } from "react";
import mascotAnim from "@/assets/today-vitali-clean-anim.webp.asset.json";
import mascotStill from "@/assets/today-vitali-clean.png.asset.json";

// Transparent animated WebP instead of the old video: the video's black
// background showed as a border around the mascot on the white header card.
export function TodayMascot() {
  const [reduced, setReduced] = useState(false);
  const [animOk, setAnimOk] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const showAnim = animOk && !reduced;
  return (
    <div className="today-mascot pointer-events-none absolute" aria-hidden="true">
      <img src={mascotStill.url} alt="" className={`size-full object-contain ${showAnim ? "invisible" : ""}`} />
      <img src={mascotAnim.url} alt="" onError={() => setAnimOk(false)}
        className={`today-mascot-anim absolute inset-0 size-full object-contain ${showAnim ? "" : "invisible"}`} />
    </div>
  );
}
