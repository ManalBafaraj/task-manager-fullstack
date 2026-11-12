export type FocusMinutes = 15 | 25 | 45 | 60;
export type Appearance = "light" | "dark" | "system";
export type CompletionSoundId = "chime" | "bright" | "gentle" | "pulse";
export interface Preferences {
  focusMinutes: FocusMinutes;
  completionSound: boolean;
  completionSoundId: CompletionSoundId;
  browserNotifications: boolean;
  remindersEnabled: boolean;
  defaultReminderTime: string;
  appearance: Appearance;
}
export const FOCUS_MINUTES: readonly FocusMinutes[];
export const COMPLETION_SOUNDS: readonly CompletionSoundId[];
export const DEFAULT_PREFERENCES: Readonly<Preferences>;
export function normalizePreferences(input: unknown): Preferences;
export function validatePreferencesPatch(
  input: unknown,
): { ok: true; value: Partial<Preferences> } | { ok: false; message: string };
