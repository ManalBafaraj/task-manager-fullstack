import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/taskflow/Logo";
import { LegalLinks } from "@/components/taskflow/LegalLinks";
export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — TaskFlow" }] }),
  component: TermsPage,
});
function TermsPage() {
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
          <p className="eyebrow">CLEAR EXPECTATIONS</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Terms of Use</h1>
        </div>
        <p>
          TaskFlow is a personal, non-commercial portfolio project offered as available for everyday
          task planning. Features, hosting capacity, and availability can change.
        </p>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Using the app</h2>
          <p>
            Use your own account, keep your password private, and do not attempt to access other
            users’ data, disrupt the service, or upload unlawful material. You remain responsible
            for the content you enter and for keeping independent copies of important information.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Practical limits</h2>
          <p>
            The app is not an emergency or safety-critical reminder system. Timers and notifications
            depend on an open or suspended browser tab, device support, permissions, connectivity,
            and hosting availability. They are not guaranteed background push notifications. Free
            hosting can have usage limits, pauses, and cold starts.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Accounts and changes</h2>
          <p>
            You can update account settings or delete your account and tasks through Settings.
            Forgotten-password email recovery is not currently available. These terms describe the
            current project and do not replace any rights or obligations that applicable law
            provides.
          </p>
        </section>
        <p>
          Read the{" "}
          <Link to="/privacy" className="font-medium text-primary underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          for how account and task information is handled.
        </p>
      </main>
      <LegalLinks />
    </div>
  );
}
