import { useLayoutEffect, useRef, useState } from "react";
import mascotStill from "@/assets/nutrition-mascot-salad.png.asset.json";
import { Localized } from "@/components/Localized";

// Right corner of the mouth inside the 496x600 artwork, as fractions of the drawn box.
const MOUTH = { x: 0.585, y: 0.4 };

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
        Math.max(mx + 34, bub.offsetLeft + 34),
        bub.offsetLeft + bub.offsetWidth - 34,
      );
      // Start inside the bubble so the two same-coloured shapes merge without a notch.
      const ay = bub.offsetTop + bub.offsetHeight - 6;
      // Curved tapered tail: a wide cone leaving the bubble that narrows to a
      // point at the mouth, sweeping clear of the head and the raised hand.
      const drop = my - ay;
      const c1x = ax + 10;
      const c1y = ay + drop * 0.45;
      const c2x = mx + 18;
      const c2y = my - drop * 0.25;
      const left: string[] = [];
      const right: string[] = [];
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const m = 1 - t;
        const px = m ** 3 * ax + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t ** 3 * mx;
        const py = m ** 3 * ay + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t ** 3 * my;
        const gx = 3 * m * m * (c1x - ax) + 6 * m * t * (c2x - c1x) + 3 * t * t * (mx - c2x);
        const gy = 3 * m * m * (c1y - ay) + 6 * m * t * (c2y - c1y) + 3 * t * t * (my - c2y);
        const gl = Math.hypot(gx, gy) || 1;
        const w = 15 * (1 - t) ** 0.9;
        const ox = (gy / gl) * w;
        const oy = (gx / gl) * w;
        const r = (v: number) => Math.round(v * 10) / 10;
        left.push(`${r(px - ox)} ${r(py + oy)}`);
        right.push(`${r(px + ox)} ${r(py - oy)}`);
      }
      setTail({
        d: `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`,
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
