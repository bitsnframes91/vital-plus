import mascotStill from "@/assets/nutrition-mascot-salad.png.asset.json";
import { Localized } from "@/components/Localized";

// Smooth CSS motion on the still artwork: the AI-generated video made the bowl jitter.
// When the day has no meal yet, the mascot "speaks" the prompt from a bubble below it.
export function NutritionMascot({ message }: { message?: string | undefined }) {
  return (
    <>
      <div className="nutrition-mascot pointer-events-none absolute" aria-hidden="true">
        <img src={mascotStill.url} alt="" className="nutrition-mascot-img size-full object-contain" />
      </div>
      {message && (
        <p role="status" className="nutrition-mascot-bubble text-ink"><Localized>{message}</Localized></p>
      )}
    </>
  );
}
