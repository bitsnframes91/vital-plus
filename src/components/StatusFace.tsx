import statusGood from "@/assets/status-good.png.asset.json";
import statusNeutral from "@/assets/status-neutral.png.asset.json";
import statusSad from "@/assets/status-sad.png.asset.json";

export type StatusMood = "good" | "neutral" | "bad";

const sources: Record<StatusMood, string> = {
  good: statusGood.url,
  neutral: statusNeutral.url,
  bad: statusSad.url,
};

export function StatusFace({ mood, className = "size-5", alt = "" }: { mood: StatusMood; className?: string; alt?: string }) {
  return <img src={sources[mood]} alt={alt} className={`shrink-0 ${className}`} loading="lazy" />;
}
