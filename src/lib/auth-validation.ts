const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 6;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  if (!input.email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = "Please enter a valid email address.";
  if (!input.password) errors.password = "Please enter your password.";
  return errors;
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Please enter your name.";
  else if (name.length < 2) errors.name = "Name must be at least 2 characters.";
  if (!input.email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(input.email.trim())) errors.email = "Please enter a valid email address.";
  if (!input.password) errors.password = "Please create a password.";
  else if (input.password.length < PASSWORD_MIN)
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  if (!input.confirmPassword) errors.confirmPassword = "Please confirm your password.";
  else if (input.confirmPassword !== input.password)
    errors.confirmPassword = "Passwords do not match.";
  return errors;
}
