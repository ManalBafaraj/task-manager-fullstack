export const FOCUS_MINUTES = [15, 25, 45, 60];
export const COMPLETION_SOUNDS = ["chime", "bright", "gentle", "pulse"];
export const DEFAULT_PREFERENCES = Object.freeze({
  focusMinutes: 25,
  completionSound: true,
  completionSoundId: "chime",
  browserNotifications: false,
  remindersEnabled: true,
  defaultReminderTime: "09:00",
  appearance: "light",
});
const validators = {
  focusMinutes: (value) => FOCUS_MINUTES.includes(value),
  completionSound: (value) => typeof value === "boolean",
  completionSoundId: (value) => COMPLETION_SOUNDS.includes(value),
  browserNotifications: (value) => typeof value === "boolean",
  remindersEnabled: (value) => typeof value === "boolean",
  defaultReminderTime: (value) =>
    typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
  appearance: (value) => ["light", "dark", "system"].includes(value),
};
export function validatePreferencesPatch(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    return { ok: false, message: "Preferences must be an object." };
  const value = {};
  for (const [key, entry] of Object.entries(input)) {
    if (!Object.hasOwn(validators, key) || !validators[key](entry))
      return { ok: false, message: `Invalid preference: ${key}.` };
    value[key] = entry;
  }
  return { ok: true, value };
}
export function normalizePreferences(input) {
  const result = { ...DEFAULT_PREFERENCES };
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (Object.hasOwn(input, key) && validators[key](input[key])) result[key] = input[key];
  }
  return result;
}
