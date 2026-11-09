import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/taskflow/AuthLayout";
import { Field, FormAlert, PasswordInput } from "@/components/taskflow/FormField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authApi, session } from "@/lib/api";
import { validateLogin, type FieldErrors, type LoginInput } from "@/lib/auth-validation";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — TaskFlow" },
      { name: "description", content: "Log in to TaskFlow and pick up where you left off." },
      { property: "og:title", content: "Log in — TaskFlow" },
      { property: "og:description", content: "Log in to TaskFlow and pick up where you left off." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof LoginInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateLogin(values);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const auth = await authApi.login({ email: values.email.trim(), password: values.password });
      session.save(auth, remember);
      toast.success(`Welcome back, ${auth.user.name.split(" ")[0]}!`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to log in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to stay on top of your tasks."
      footer={
        <>
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-primary underline-offset-4 hover:text-primary-dark hover:underline"
          >
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />

        <Field id="email" label="Email" error={errors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

        <Field id="password" label="Password" error={errors.password}>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="remember"
            checked={remember}
            onCheckedChange={(c) => setRemember(c === true)}
            disabled={loading}
          />
          <label htmlFor="remember" className="cursor-pointer select-none text-sm text-foreground">
            Remember me
          </label>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
