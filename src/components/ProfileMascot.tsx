import { useEffect, useState } from "react";
import mascotAnim from "@/assets/today-vitali-clean-anim.webp.asset.json";
import mascotStill from "@/assets/today-vitali-clean.png.asset.json";

// Same Vitali cut-out as the Heute header, reused for the Profil header.
export function ProfileMascot() {
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
    <div className="profile-mascot pointer-events-none absolute" aria-hidden="true">
      <img src={mascotStill.url} alt="" className={`size-full object-contain ${showAnim ? "invisible" : ""}`} />
      <img src={mascotAnim.url} alt="" onError={() => setAnimOk(false)}
        className={`profile-mascot-anim absolute inset-0 size-full object-contain ${showAnim ? "" : "invisible"}`} />
    </div>
  );
}
