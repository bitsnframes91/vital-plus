import { useLayoutEffect, useRef, useState } from "react";
import mascotStill from "@/assets/nutrition-mascot-salad.png.asset.json";
import { Localized } from "@/components/Localized";

// Mouth inside the 496x600 artwork, as fractions of the drawn artwork box.
const MOUTH = { x: 0.52, y: 0.41 };

// Smooth CSS motion on the still artwork: the AI-generated video made the bowl jitter.
// When the day has no meal yet, the mascot "speaks" the prompt from a rounded bubble
// whose tail is measured to point at his mouth.
export function NutritionMascot({ message }: { message?: string | undefined }) {
  const wrap = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLParagraphElement>(null);
  const [tail, setTail] = useState<{ d: string; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    if (!message) return;
    const box = wrap.current;
    const host = box?.offsetParent as HTMLElement | null;
    if (!box || !host || !bubble.current) return;
    const measure = () => {
      const bub = bubble.current;
      if (!bub) return;
      const bw = box.offsetWidth;
      const bh = box.offsetHeight;
      const img = box.querySelector("img");
      const nw = img?.naturalWidth || 496;
      const nh = img?.naturalHeight || 600;
      // object-contain letterboxing: find the artwork's real box inside the frame.
      const scale = Math.min(bw / nw, bh / nh);
      const cw = nw * scale;
      const ch = nh * scale;
      const cx = box.offsetLeft + (bw - cw) / 2;
      const cy = box.offsetTop + (bh - ch) / 2;
      const mx = cx + MOUTH.x * cw;
      const my = cy + MOUTH.y * ch;
      const ax = Math.min(
        Math.max(mx + 30, bub.offsetLeft + 26),
        bub.offsetLeft + bub.offsetWidth - 26,
      );
      const ay = bub.offsetTop + bub.offsetHeight;
      const dx = mx - ax;
      const dy = my - ay;
      const len = Math.hypot(dx, dy) || 1;
      const tl = Math.min(Math.max(len * 0.3, 18), 34);
      const w = Math.min(10, tl * 0.42);
      const nx = -(dy / len) * w;
      const ny = (dx / len) * w;
      const tipX = ax + (dx / len) * tl;
      const tipY = ay + (dy / len) * tl;
      const midX = ax + (dx / len) * tl * 0.5;
      const midY = ay + (dy / len) * tl * 0.5;
      setTail({
        d: `M ${ax - nx} ${ay - ny} Q ${midX - nx * 0.3} ${midY - ny * 0.3} ${tipX} ${tipY} Q ${midX + nx * 0.3} ${midY + ny * 0.3} ${ax + nx} ${ay + ny} Z`,
        w: host.offsetWidth,
        h: host.offsetHeight,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [message]);

  return (
    <>
      <div className="nutrition-mascot pointer-events-none absolute" ref={wrap} aria-hidden="true">
        <img src={mascotStill.url} alt="" className="nutrition-mascot-img size-full object-contain" />
      </div>
      {message && (
        <p ref={bubble} role="status" className="nutrition-mascot-says text-ink">
          <Localized>{message}</Localized>
        </p>
      )}
      {message && tail && (
        <svg
          className="nutrition-mascot-says-tail absolute inset-0"
          width={tail.w}
          height={tail.h}
          viewBox={`0 0 ${tail.w} ${tail.h}`}
          aria-hidden="true"
          focusable="false"
        >
          <path d={tail.d} />
        </svg>
      )}
    </>
  );
}
