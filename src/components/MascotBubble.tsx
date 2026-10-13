import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Localized } from "@/components/Localized";

// Shared mascot speech bubble: a rounded pill above the mascot with a JS-measured
// tapered tail that aims at the given mouth position but stops short of the head.
// Class names follow the original Ernährung bubble so both mascots share the styles.
export type MascotMouth = { x: number; y: number };

export function MascotBubble({
  message,
  mouth,
  naturalWidth,
  naturalHeight,
  mascotRef,
}: {
  message: string;
  mouth: MascotMouth;
  naturalWidth: number;
  naturalHeight: number;
  mascotRef: RefObject<HTMLDivElement | null>;
}) {
  const bubble = useRef<HTMLParagraphElement>(null);
  const [tail, setTail] = useState<{ d: string; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    if (!message) return;
    const box = mascotRef.current;
    const host = box?.offsetParent as HTMLElement | null;
    if (!box || !host || !bubble.current) return;
    const measure = () => {
      const bub = bubble.current;
      if (!bub) return;
      const bw = box.offsetWidth;
      const bh = box.offsetHeight;
      // object-contain letterboxing: find the artwork's real box inside the frame.
      const scale = Math.min(bw / naturalWidth, bh / naturalHeight);
      const cw = naturalWidth * scale;
      const ch = naturalHeight * scale;
      const cx = box.offsetLeft + (bw - cw) / 2;
      const cy = box.offsetTop + (bh - ch) / 2;
      const mx = cx + mouth.x * cw;
      const my = cy + mouth.y * ch;
      const ax = Math.min(
        Math.max(mx + 34, bub.offsetLeft + 34),
        bub.offsetLeft + bub.offsetWidth - 34,
      );
      // Start inside the bubble so the two same-coloured shapes merge without a notch.
      const ay = bub.offsetTop + bub.offsetHeight - 6;
      // Curved tapered tail: a wide cone leaving the bubble that narrows to a
      // point in the gap just above the head — it aims at the face but stops
      // short instead of running all the way down to the mouth.
      const tx = ax + (mx - ax) * 0.25;
      const ty = ay + (my - ay) * 0.3;
      const drop = ty - ay;
      const c1x = ax + 10;
      const c1y = ay + drop * 0.45;
      const c2x = tx + 18;
      const c2y = ty - drop * 0.25;
      const left: string[] = [];
      const right: string[] = [];
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const m = 1 - t;
        const px = m ** 3 * ax + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t ** 3 * tx;
        const py = m ** 3 * ay + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t ** 3 * ty;
        const gx = 3 * m * m * (c1x - ax) + 6 * m * t * (c2x - c1x) + 3 * t * t * (tx - c2x);
        const gy = 3 * m * m * (c1y - ay) + 6 * m * t * (c2y - c1y) + 3 * t * t * (ty - c2y);
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
  }, [message, mouth.x, mouth.y, naturalWidth, naturalHeight, mascotRef]);

  return (
    <div className="nutrition-mascot-says-layer absolute inset-0">
      <p ref={bubble} role="status" className="nutrition-mascot-says text-ink">
        <Localized>{message}</Localized>
      </p>
      {tail && (
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
    </div>
  );
}
