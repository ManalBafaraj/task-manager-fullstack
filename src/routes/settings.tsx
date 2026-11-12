import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2, LogOut, Settings2, Volume2 } from "lucide-react";
import { AppShell } from "@/components/taskflow/AppShell";
import { LegalLinks } from "@/components/taskflow/LegalLinks";
import { Field, PasswordInput } from "@/components/taskflow/FormField";
import { TimeWheelPicker } from "@/components/taskflow/TimeWheelPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccount } from "@/hooks/use-account";
import { accountApi, authApi, session, type User } from "@/lib/api";
import { requireSession } from "@/lib/auth-guard";
import {
  completionSoundOptions,
  notificationStatus,
  playCompletionChime,
  prepareCompletionAudio,
  requestCompletionNotifications,
} from "@/lib/completion-alert";
import { COMPLETION_SOUNDS, FOCUS_MINUTES, type Preferences } from "../../shared/preferences";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireSession,
  head: () => ({
    meta: [{ title: "Settings — TaskFlow" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});
function SettingsPage() {
  const account = useAccount();
  const client = useQueryClient();
  const navigate = useNavigate();
  const logout = () => {
    authApi.logout();
    client.clear();
    void navigate({ to: "/" });
  };
  return (
    <AppShell user={account.user} onLogout={logout}>
      <header>
        <p className="eyebrow flex items-center gap-2">
          <Settings2 className="h-4 w-4" /> MAKE TASKFLOW YOURS
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Small preferences for a day that works for you.
        </p>
      </header>
      {account.error && (
        <div
          role="status"
          className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border p-4 text-sm"
        >
          Could not refresh your account. Saved values are shown.
          <Button variant="outline" disabled={account.loading} onClick={account.reload}>
            Try again
          </Button>
        </div>
      )}
      {account.user ? (
        <SettingsForms key={account.user.id} user={account.user} logout={logout} />
      ) : (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          Loading your account…
        </p>
      )}
      <div className="mt-8 border-t pt-4">
        <LegalLinks />
      </div>
    </AppShell>
  );
}
function SettingsForms({ user, logout }: { user: User; logout: () => void }) {
  const { preferences, save, loading } = useAccount();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState(user.name);
  const [nameDirty, setNameDirty] = useState(false);
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [dirty, setDirty] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [prefsMessage, setPrefsMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [prefsError, setPrefsError] = useState("");
  const [permission, setPermission] =
    useState<ReturnType<typeof notificationStatus>>("unsupported");
  const [soundMessage, setSoundMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    if (!dirty) setDraft(preferences);
  }, [preferences, dirty]);
  useEffect(() => {
    if (!nameDirty) setName(user.name);
  }, [user.name, nameDirty]);
  useEffect(() => {
    const sync = () => setPermission(notificationStatus());
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setDirty(true);
    setPrefsMessage("");
  };
  const profile = async (event: FormEvent) => {
    event.preventDefault();
    if (profileBusy) return;
    setProfileMessage("");
    setProfileError("");
    if (name.trim().length < 2 || name.trim().length > 60) {
      setProfileError("Use 2–60 characters for your name.");
      return;
    }
    setProfileBusy(true);
    try {
      await save({ name: name.trim() });
      setNameDirty(false);
      setProfileMessage("Name saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save your name.");
    } finally {
      setProfileBusy(false);
    }
  };
  const savePreferences = async (event: FormEvent) => {
    event.preventDefault();
    if (prefsBusy) return;
    setPrefsBusy(true);
    setPrefsError("");
    setPrefsMessage("");
    try {
      await save({ preferences: draft });
      setDirty(false);
      setPrefsMessage("Preferences saved. Active sessions keep their original duration.");
    } catch (error) {
      setPrefsError(error instanceof Error ? error.message : "Could not save preferences.");
    } finally {
      setPrefsBusy(false);
    }
  };
  const password = async (event: FormEvent) => {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError("");
    setPasswordMessage("");
    if (
      !currentPassword ||
      newPassword.length < 8 ||
      newPassword !== confirmation ||
      newPassword === currentPassword
    ) {
      setPasswordError(
        "Enter your current password and a different new password of at least 8 characters, with matching confirmation.",
      );
      return;
    }
    setPasswordBusy(true);
    try {
      const auth = await accountApi.password({
        currentPassword,
        newPassword,
        confirmPassword: confirmation,
      });
      session.updateUser(auth.user, auth.token);
      client.setQueryData(["account", auth.user.id], auth.user);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setPasswordMessage("Password changed. Other sessions must sign in again.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change password.");
    } finally {
      setPasswordBusy(false);
    }
  };
  const remove = async (event: FormEvent) => {
    event.preventDefault();
    if (deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await accountApi.remove({ currentPassword: deletePassword, confirmation: deleteConfirm });
      for (const key of [
        `taskflow_sprint_${user.id}`,
        `taskflow_preferences_${user.id}`,
        `taskflow_read_notifications_${user.email}`,
        `taskflow_read_notifications_${user.id}`,
      ])
        localStorage.removeItem(key);
      session.clear();
      client.clear();
      void navigate({ to: "/" });
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete your account. Nothing was confirmed deleted.",
      );
    } finally {
      setDeleting(false);
    }
  };
  const section = "border-b py-6";
  return (
    <div className="mt-5 max-w-3xl rounded-2xl border bg-card px-4 sm:px-6">
      <section className={section} aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-lg font-semibold">
          Profile
        </h2>
        <form onSubmit={profile} className="mt-4 space-y-4">
          <Field id="account-email" label="Email">
            {(props) => (
              <Input
                {...props}
                value={user.email}
                readOnly
                aria-readonly="true"
                className="bg-muted"
              />
            )}
          </Field>
          <Field id="display-name" label="Display name" error={profileError}>
            {(props) => (
              <Input
                {...props}
                autoComplete="name"
                maxLength={60}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setNameDirty(true);
                  setProfileMessage("");
                }}
              />
            )}
          </Field>
          <Button type="submit" disabled={profileBusy || !nameDirty} className="min-w-32">
            {profileBusy && <Loader2 className="animate-spin" />}Save name
          </Button>
          <p role="status" className="text-sm text-completed-strong">
            {profileMessage}
          </p>
        </form>
      </section>
      <form onSubmit={savePreferences}>
        <fieldset className={section} disabled={prefsBusy || loading}>
          <legend className="sr-only">Focus Session preferences</legend>
          <h2 className="text-lg font-semibold">Focus Session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A default for your next session. A running timer keeps its original length.
          </p>
          <label htmlFor="focus-duration" className="mb-2 mt-4 block text-sm font-medium">
            Default duration
          </label>
          <Select
            value={String(draft.focusMinutes)}
            onValueChange={(value) => {
              const minutes = FOCUS_MINUTES.find((item) => String(item) === value);
              if (minutes !== undefined) set("focusMinutes", minutes);
            }}
          >
            <SelectTrigger id="focus-duration" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_MINUTES.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {minutes} minutes
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </fieldset>
        <fieldset className={section} disabled={prefsBusy}>
          <legend className="sr-only">Completion alerts</legend>
          <h2 className="text-lg font-semibold">When your timer finishes</h2>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={draft.completionSound}
              onChange={(event) => set("completionSound", event.target.checked)}
            />{" "}
            Completion sound
          </label>
          <label htmlFor="completion-sound" className="mb-2 mt-3 block text-sm font-medium">
            Sound style
          </label>
          <Select
            value={draft.completionSoundId}
            onValueChange={(value) => {
              if (COMPLETION_SOUNDS.some((sound) => sound === value))
                set("completionSoundId", value as Preferences["completionSoundId"]);
            }}
          >
            <SelectTrigger id="completion-sound" className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {completionSoundOptions.map((sound) => (
                <SelectItem key={sound.id} value={sound.id}>
                  {sound.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a short or longer tone, with a softer or louder level. Preview it before saving.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              const ready = await prepareCompletionAudio();
              setSoundMessage(
                ready && playCompletionChime(draft.completionSoundId)
                  ? "Sound preview played."
                  : "Audio is unavailable or blocked. Visual completion alerts still work.",
              );
            }}
          >
            <Volume2 /> Test sound
          </Button>
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            {soundMessage}
          </p>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={draft.browserNotifications}
              disabled={permission !== "granted"}
              onChange={(event) => set("browserNotifications", event.target.checked)}
            />{" "}
            Browser completion notifications
          </label>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {permission === "unsupported"
              ? "Notifications need HTTPS and a supported browser. Visual alerts still work."
              : permission === "denied"
                ? "Blocked in this browser. You can change this in browser site settings."
                : permission === "granted"
                  ? "Browser permission granted. Save preferences to apply your choice."
                  : "Optional. Permission is requested only when you choose to enable it."}
          </p>
          {permission !== "unsupported" && permission !== "denied" && (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={async () => {
                const result = await requestCompletionNotifications();
                setPermission(result);
                if (result === "granted") set("browserNotifications", true);
              }}
            >
              <Bell /> Enable on this browser
            </Button>
          )}
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Keep TaskFlow open for alerts. Background tabs may be delayed; an elapsed timer is
            checked when you return. No alarm runs after the browser is fully closed.
          </p>
        </fieldset>
        <fieldset className={section} disabled={prefsBusy}>
          <legend className="sr-only">Reminder preferences</legend>
          <h2 className="text-lg font-semibold">Reminders</h2>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-primary"
              checked={draft.remindersEnabled}
              onChange={(event) => set("remindersEnabled", event.target.checked)}
            />{" "}
            Enable my reminders
          </label>
          <p className="mb-4 text-xs text-muted-foreground">
            Pausing hides reminders without changing saved task settings.
          </p>
          <label htmlFor="default-reminder-time" className="mb-2 block text-sm font-medium">
            Default reminder time
          </label>
          <TimeWheelPicker
            id="default-reminder-time"
            value={draft.defaultReminderTime}
            onChange={(value) => set("defaultReminderTime", value)}
            className="max-w-xs"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Prefills new tasks only. Existing reminder times stay as saved.
          </p>
        </fieldset>
        <fieldset className={section} disabled={prefsBusy}>
          <legend className="sr-only">Appearance</legend>
          <h2 className="text-lg font-semibold">Appearance</h2>
          <label htmlFor="appearance" className="mb-2 mt-3 block text-sm font-medium">
            Theme
          </label>
          <Select
            value={draft.appearance}
            onValueChange={(value) => {
              if (value === "light" || value === "dark" || value === "system")
                set("appearance", value);
            }}
          >
            <SelectTrigger id="appearance" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            System follows this device’s appearance. Save to apply your choice.
          </p>
        </fieldset>
        <div className="border-b py-5">
          <Button type="submit" disabled={prefsBusy || !dirty} className="min-w-40">
            {prefsBusy ? <Loader2 className="animate-spin" /> : <Check />}Save preferences
          </Button>
          <p role="status" className="mt-2 text-sm text-completed-strong">
            {prefsMessage}
          </p>
          {prefsError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {prefsError}
            </p>
          )}
        </div>
      </form>
      <section className={section}>
        <h2 className="text-lg font-semibold">Account and security</h2>
        <form onSubmit={password} className="mt-4 space-y-4">
          <Field id="current-password" label="Current password">
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            )}
          </Field>
          <Field
            id="new-password"
            label="New password"
            hint="At least 8 characters; maximum 72 UTF-8 bytes."
          >
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                maxLength={72}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </Field>
          <Field id="confirm-new-password" label="Confirm new password">
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            )}
          </Field>
          <Button type="submit" variant="outline" disabled={passwordBusy} className="min-w-40">
            {passwordBusy && <Loader2 className="animate-spin" />}Change password
          </Button>
          <p role="status" className="text-sm text-completed-strong">
            {passwordMessage}
          </p>
          {passwordError && (
            <p role="alert" className="text-sm text-destructive">
              {passwordError}
            </p>
          )}
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          Forgotten-password email recovery is not available in this personal project. No email
          provider is connected.
        </p>
        <Button variant="ghost" className="mt-4" onClick={logout}>
          <LogOut /> Logout
        </Button>
      </section>
      <section className="py-6">
        <h2 className="text-lg font-semibold text-destructive">Delete account</h2>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
          Permanently delete your account and its tasks. Other accounts are not affected.
        </p>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </section>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-card sm:max-w-md">
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This removes your account and tasks permanently. Enter your password and type DELETE to
            confirm.
          </DialogDescription>
          <form onSubmit={remove} className="space-y-4">
            <Field id="delete-password" label="Current password">
              {(props) => (
                <PasswordInput
                  {...props}
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              )}
            </Field>
            <Field id="delete-confirmation" label="Type DELETE">
              {(props) => (
                <Input
                  {...props}
                  autoComplete="off"
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                />
              )}
            </Field>
            {deleteError && (
              <p role="alert" className="text-sm text-destructive">
                {deleteError}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={deleting || deleteConfirm !== "DELETE" || !deletePassword}
              >
                {deleting && <Loader2 className="animate-spin" />}Delete my account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
