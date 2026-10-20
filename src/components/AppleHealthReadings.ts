import { useEffect, useState } from "react";
import { useAppleHealth } from "./AppleHealth";
import { useStore, dailyValue, todayDateKey } from "@/lib/store";
import { healthReadings } from "@/lib/apple-health/readings";
export function useHealthReadings() {
  const health = useAppleHealth();
  const { s } = useStore();
  const [day, setDay] = useState(todayDateKey);
  useEffect(() => { const timer = setInterval(() => setDay(todayDateKey()), 30000); return () => clearInterval(timer); }, []);
  return healthReadings(health?.account, day, { steps: dailyValue(s.body.steps, s.body.stepsDate), sleepHours: dailyValue(s.body.sleepHours, s.body.sleepDate) });
}
