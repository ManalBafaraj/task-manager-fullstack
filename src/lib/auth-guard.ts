import { redirect } from "@tanstack/react-router";
import { session } from "./api";

// Tokens live in browser storage; private data is always protected by the API.
export function requireSession() {
  if (typeof window !== "undefined" && !session.getToken()) throw redirect({ to: "/login" });
}
