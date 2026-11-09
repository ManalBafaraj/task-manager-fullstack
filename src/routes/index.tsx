import { createFileRoute, redirect } from "@tanstack/react-router";

// TaskFlow has no landing page: the entry point is the login screen.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TaskFlow — Personal task manager" },
      {
        name: "description",
        content: "Sign in to TaskFlow to capture, organize and finish your personal tasks.",
      },
      { property: "og:title", content: "TaskFlow — Personal task manager" },
      {
        property: "og:description",
        content: "Sign in to TaskFlow to capture, organize and finish your personal tasks.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
