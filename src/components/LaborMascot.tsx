import { useEffect, useRef, useState } from "react";
import mascotVideo from "@/assets/labor-mascot-full.webm.asset.json";
import mascotStill from "@/assets/labor-mascot-full.png.asset.json";
import { MascotBubble, type MascotMouth } from "@/components/MascotBubble";

// Right corner of the mouth inside the 360x501 artwork, as fractions of the drawn box.
const MOUTH: MascotMouth = { x: 0.55, y: 0.52 };

export function LaborMascot({ message }: { message?: string | undefined }) {
  const wrap = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const video = videoRef.current;
      if (!video) return;
      if (preference.matches) { video.pause(); setPlaying(false); }
      else void video.play().catch(() => setPlaying(false));
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return (
    <>
      <div className="labor-mascot pointer-events-none absolute" ref={wrap} aria-hidden="true">
        <img src={mascotStill.url} alt="" className={`size-full object-contain ${playing ? "invisible" : ""}`} />
        <video ref={videoRef} src={mascotVideo.url} muted loop playsInline preload="auto"
          onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)}
          className={`absolute inset-0 size-full object-contain ${playing ? "" : "invisible"}`} />
      </div>
      {message && (
        <MascotBubble message={message} mouth={MOUTH} naturalWidth={360} naturalHeight={501} mascotRef={wrap} />
      )}
    </>
  );
}
