import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/taskflow/AuthLayout";
import { Field, FormAlert, PasswordInput } from "@/components/taskflow/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, session } from "@/lib/api";
import {
  PASSWORD_MIN,
  validateRegister,
  type FieldErrors,
  type RegisterInput,
} from "@/lib/auth-validation";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — TaskFlow" },
      {
        name: "description",
        content: "Create your free TaskFlow account and start organizing your personal tasks.",
      },
      { property: "og:title", content: "Create account — TaskFlow" },
      {
        property: "og:description",
        content: "Create your free TaskFlow account and start organizing your personal tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

const EMPTY: RegisterInput = { name: "", email: "", password: "", confirmPassword: "" };

function RegisterPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof RegisterInput, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validateRegister(values);
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const auth = await authApi.register({
        name: values.name,
        email: values.email.trim(),
        password: values.password,
      });
      session.save(auth, true);
      toast.success("Account created", { description: "Welcome to TaskFlow!" });
      navigate({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account.";
      setFormError(message);
      toast.error("Couldn’t create account", { description: message });
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It only takes a minute to get organized."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:text-primary-dark hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />

        <Field id="name" label="Name" error={errors.name}>
          {(p) => (
            <Input
              {...p}
              autoComplete="name"
              placeholder="Your full name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

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

        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint={`Use at least ${PASSWORD_MIN} characters.`}
        >
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="new-password"
              placeholder="Create a password"
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

        <Field id="confirmPassword" label="Confirm password" error={errors.confirmPassword}>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={values.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              disabled={loading}
            />
          )}
        </Field>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          {loading ? "Creating account…" : "Create Account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
