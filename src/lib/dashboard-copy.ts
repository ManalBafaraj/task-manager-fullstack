import type { countByStatus } from "./tasks";
type Counts = ReturnType<typeof countByStatus>;
const phrases = {
  empty: [
    "Start with one thing that matters.",
    "A fresh page. Make room for one small step.",
    "Nothing on the list yet. Begin when you’re ready.",
  ],
  pending: [
    "Choose one small next step.",
    "A little direction is a good beginning.",
    "Start small, and let the rest follow.",
  ],
  progress: [
    "Keep the rhythm.",
    "One thing at a time is enough.",
    "A little steady attention goes a long way.",
  ],
  partial: [
    "A little progress adds up.",
    "You’re making room for what comes next.",
    "Keep going at your own pace.",
  ],
  complete: [
    "Everything is complete. Enjoy the breathing room.",
    "All done for now. Take a little time back.",
    "Your list is complete. Leave a little space for yourself.",
  ],
};
export function dashboardPhrase(counts: Counts, user: string, localDate: string): string {
  const state = !counts.all
    ? "empty"
    : counts.completed === counts.all
      ? "complete"
      : counts["in-progress"]
        ? "progress"
        : counts.completed
          ? "partial"
          : "pending";
  let hash = 2166136261;
  for (const char of `${user}|${localDate}|${state}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const tail = phrases[state][hash % phrases[state].length]!;
  const word = (n: number) => (n === 1 ? "One" : n === 2 ? "Two" : String(n));
  if (state === "progress") {
    const n = counts["in-progress"];
    return `${word(n)} ${n === 1 ? "task" : "tasks"} in progress. ${tail}`;
  }
  if (state === "pending") {
    const n = counts.pending;
    return `${word(n)} ${n === 1 ? "task is" : "tasks are"} waiting. ${tail}`;
  }
  if (state === "partial") return `${counts.completed} of ${counts.all} tasks complete. ${tail}`;
  return tail;
}
