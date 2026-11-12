import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/taskflow/Logo";
import { LegalLinks } from "@/components/taskflow/LegalLinks";
export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy — TaskFlow" }] }),
  component: PrivacyPage,
});
function PrivacyPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-5 py-6 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" aria-label="TaskFlow home">
          <Logo />
        </Link>
        <Link to="/" className="flex min-h-11 items-center text-sm text-muted-foreground">
          Back to home
        </Link>
      </header>
      <main className="space-y-7 py-10 text-sm leading-relaxed text-muted-foreground">
        <div>
          <p className="eyebrow">A PERSONAL PROJECT, WITH CARE</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Privacy Policy</h1>
        </div>
        <p>
          TaskFlow is a personal portfolio project for organizing tasks. This page describes the app
          as it currently works; it does not promise uninterrupted service or absolute security.
        </p>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">What the app stores</h2>
          <p>
            Your display name, email, a password hash, account preferences, and tasks are stored in
            the app’s MongoDB database. Task details can include descriptions, checklists,
            categories, deadlines, and reminder settings. Passwords are hashed before storage.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Your browser</h2>
          <p>
            Sign-in tokens use local storage or session storage according to Remember me. Focus
            Session state, cached preferences, theme choice, and read-notification state can be
            stored in your browser. These records support sign-in and returning to work; they are
            not advertising trackers. Shared-device users should log out when finished.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Hosting and notifications</h2>
          <p>
            The app is prepared for Vercel hosting and MongoDB Atlas. Hosting providers may process
            connection information and logs under their own policies. There is no added advertising
            or analytics service. Fonts may be requested from Google Fonts. Browser notifications
            are optional and depend on permission, browser, and device support. A browser alarm
            cannot be guaranteed after the browser is fully closed.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Control and deletion</h2>
          <p>
            Settings lets you change your name, preferences, and password. Delete account requires
            your current password and explicit confirmation, and removes your account and tasks from
            the live application database. Hosting-provider retention is governed by those
            providers. Browser notification history is controlled by your device. Avoid storing
            information you cannot afford to lose in this small personal project.
          </p>
        </section>
        <p>
          Forgotten-password email recovery is not currently provided. No external email provider is
          connected.
        </p>
      </main>
      <LegalLinks />
    </div>
  );
}
