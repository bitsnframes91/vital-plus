import mascotStill from "@/assets/nutrition-mascot-salad.png.asset.json";

// Smooth CSS motion on the still artwork: the AI-generated video made the bowl jitter.
export function NutritionMascot() {
  return (
    <div className="nutrition-mascot pointer-events-none absolute" aria-hidden="true">
      <img src={mascotStill.url} alt="" className="nutrition-mascot-img size-full object-contain" />
    </div>
  );
}
