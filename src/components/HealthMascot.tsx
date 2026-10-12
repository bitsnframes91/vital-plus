import { useEffect, useRef, useState } from "react";
import mascotAnim from "@/assets/health-mascot-anim.webp.asset.json";
import mascotStill from "@/assets/health-mascot-transparent.png.asset.json";
import { MascotBubble, type MascotMouth } from "@/components/MascotBubble";

// Right corner of the mouth inside the 272x344 artwork, as fractions of the drawn box.
const MOUTH: MascotMouth = { x: 0.58, y: 0.5 };

// Like the Ernährung mascot, the doctor can "speak" a prompt from a rounded bubble
// whose tail is measured to point at his mouth.
export function HealthMascot({ message }: { message?: string | undefined }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return (
    <>
      <div className="health-mascot pointer-events-none absolute" ref={wrap} aria-hidden="true">
        <img
          src={reducedMotion ? mascotStill.url : mascotAnim.url}
          alt=""
          className="size-full object-contain"
        />
      </div>
      {message && (
        <MascotBubble message={message} mouth={MOUTH} naturalWidth={272} naturalHeight={344} mascotRef={wrap} />
      )}
    </>
  );
}
