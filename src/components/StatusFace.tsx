import statusGood from "@/assets/status-good.png";
import statusNeutral from "@/assets/status-neutral.png";
import statusSad from "@/assets/status-sad.png";

export type StatusMood = "good" | "neutral" | "bad";

const sources: Record<StatusMood, string> = { good: statusGood, neutral: statusNeutral, bad: statusSad };

export function StatusFace({ mood, className = "size-5", alt = "" }: { mood: StatusMood; className?: string; alt?: string }) {
  return <img src={sources[mood]} alt={alt} className={`shrink-0 ${className}`} loading="lazy" />;
}
