import { normalizePreferences, type Preferences } from "../../shared/preferences";

export function cachedPreferences(id: string): Preferences | undefined {
  try {
    const raw = localStorage.getItem(`taskflow_preferences_${id}`);
    return raw ? normalizePreferences(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}
export function cachePreferences(id: string, preferences: Preferences) {
  try {
    localStorage.setItem(`taskflow_preferences_${id}`, JSON.stringify(preferences));
  } catch {
    /* Browsers may restrict storage; backend remains authoritative. */
  }
}
export function applyAppearance(appearance: Preferences["appearance"]) {
  const dark =
    appearance === "dark" ||
    (appearance === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
// Runs before the stylesheet and React hydration; only the root theme attribute differs.
export const THEME_BOOTSTRAP = `(function(){try{var r=localStorage.getItem('taskflow_user')||sessionStorage.getItem('taskflow_user');var u=r?JSON.parse(r):null;var p=u&&(u.preferences||JSON.parse(localStorage.getItem('taskflow_preferences_'+u.id)||'null'));var a=p&&p.appearance||'light';var d=a==='dark'||(a==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})();`;
