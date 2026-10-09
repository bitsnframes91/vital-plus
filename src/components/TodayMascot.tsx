import { useEffect, useRef } from "react";
import mascotVideo from "@/assets/heute-mascot-transparent.webm.asset.json";
import mascotStill from "@/assets/heute-mascot-transparent.png.asset.json";

export function TodayMascot() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const video = videoRef.current;
      if (!video) return;
      if (preference.matches) video.pause();
      else void video.play().catch(() => undefined);
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return (
    <div className="today-mascot pointer-events-none absolute" aria-hidden="true">
      <img src={mascotStill.url} alt="" width={360} height={640} className="size-full object-contain motion-safe:invisible" />
      <video ref={videoRef} src={mascotVideo.url} poster={mascotStill.url} muted loop playsInline preload="auto" className="absolute inset-0 size-full object-contain" />
    </div>
  );
}