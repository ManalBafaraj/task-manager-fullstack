let context: AudioContext | null = null;
export const completionSoundOptions = [
  { id: "chime", label: "Clear chime · short, medium" },
  { id: "bright", label: "Bright alert · short, high" },
  { id: "gentle", label: "Gentle tone · long, low" },
  { id: "pulse", label: "Steady pulse · long, loud" },
] as const;
type CompletionSoundId = (typeof completionSoundOptions)[number]["id"];
export async function prepareCompletionAudio(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return false;
    context ??= new AudioContext();
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}
export function playCompletionChime(soundId: CompletionSoundId = "chime"): boolean {
  try {
    if (!context || context.state !== "running") return false;
    const start = context.currentTime;
    const sounds: Record<
      CompletionSoundId,
      {
        frequencies: number[];
        spacing: number;
        length: number;
        volume: number;
        wave: OscillatorType;
      }
    > = {
      chime: {
        frequencies: [523.25, 659.25, 783.99, 659.25],
        spacing: 0.28,
        length: 0.65,
        volume: 0.26,
        wave: "sine",
      },
      bright: {
        frequencies: [1046.5, 1318.5, 1568, 1318.5],
        spacing: 0.2,
        length: 0.42,
        volume: 0.4,
        wave: "triangle",
      },
      gentle: {
        frequencies: [392, 440, 523.25, 440, 392],
        spacing: 0.58,
        length: 0.95,
        volume: 0.15,
        wave: "sine",
      },
      pulse: {
        frequencies: [659.25, 659.25, 880, 880, 659.25, 659.25, 880, 880],
        spacing: 0.38,
        length: 0.27,
        volume: 0.48,
        wave: "square",
      },
    };
    const sound = sounds[soundId];
    sound.frequencies.forEach((frequency, index) => {
      if (!context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = sound.wave;
      oscillator.frequency.value = frequency;
      const at = start + index * sound.spacing;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(sound.volume, at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, at + sound.length);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + sound.length + 0.03);
    });
    return true;
  } catch {
    return false;
  }
}
export function notificationStatus(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && window.isSecureContext && "Notification" in window
    ? Notification.permission
    : "unsupported";
}
export async function requestCompletionNotifications(): Promise<
  NotificationPermission | "unsupported"
> {
  if (notificationStatus() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
export function announceCompletion(
  title: string,
  id: string,
  options: { sound: boolean; soundId: CompletionSoundId; notifications: boolean },
): () => void {
  if (options.sound) playCompletionChime(options.soundId);
  try {
    navigator.vibrate?.([180, 80, 180]);
  } catch {
    /* Visual feedback is always available. */
  }
  if (options.notifications && notificationStatus() === "granted") {
    try {
      new Notification("Focus session complete", { body: title, tag: `taskflow-${id}` });
    } catch {
      /* Unsupported/blocked OS notifications must not block the completion panel. */
    }
  }
  const original = document.title;
  const temporary = "Focus session complete — TaskFlow";
  document.title = temporary;
  const restore = () => {
    if (document.title === temporary) document.title = original;
  };
  const timer = setTimeout(restore, 20000);
  return () => {
    clearTimeout(timer);
    restore();
  };
}
