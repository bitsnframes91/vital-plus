/** Greeting shown in the Heute header. German convention: morning ends at 11:00, day ends at 18:00. */
export type Greeting = "Guten Morgen" | "Guten Tag" | "Guten Abend";

export function greetingFor(now: Date = new Date()): Greeting {
  const hour = now.getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}
