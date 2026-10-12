import { useRef } from "react";
import mascotStill from "@/assets/nutrition-mascot-salad.png.asset.json";
import { MascotBubble, type MascotMouth } from "@/components/MascotBubble";

// Right corner of the mouth inside the 496x600 artwork, as fractions of the drawn box.
const MOUTH: MascotMouth = { x: 0.585, y: 0.4 };

// Smooth CSS motion on the still artwork: the AI-generated video made the bowl jitter.
// When the day has no meal yet, the mascot "speaks" the prompt from a rounded bubble
// whose tail is measured to point at his mouth.
export function NutritionMascot({ message }: { message?: string | undefined }) {
  const wrap = useRef<HTMLDivElement>(null);
  return (
    <>
      <div className="nutrition-mascot pointer-events-none absolute" ref={wrap} aria-hidden="true">
        <img src={mascotStill.url} alt="" className="nutrition-mascot-img size-full object-contain" />
      </div>
      {message && (
        <MascotBubble message={message} mouth={MOUTH} naturalWidth={496} naturalHeight={600} mascotRef={wrap} />
      )}
    </>
  );
}
