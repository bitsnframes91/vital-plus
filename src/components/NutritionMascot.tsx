import { useEffect, useRef, useState } from "react";
import mascotVideo from "@/assets/nutrition-mascot-transparent.webm.asset.json";
import mascotStill from "@/assets/nutrition-mascot-transparent.png.asset.json";

export function NutritionMascot() {
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
    <div className="nutrition-mascot pointer-events-none absolute" aria-hidden="true">
      <img src={mascotStill.url} alt="" className={`size-full object-contain ${playing ? "invisible" : ""}`} />
      <video ref={videoRef} src={mascotVideo.url} muted loop playsInline preload="auto"
        onPlaying={() => setPlaying(true)} onError={() => setPlaying(false)}
        className={`absolute inset-0 size-full object-contain ${playing ? "" : "invisible"}`} />
    </div>
  );
}