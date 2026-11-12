import type { NodeHandler } from "nitro/h3";
import app from "../backend/app.js";

if (import.meta.env.DEV) {
  // The API can run separately from Vite's config-loader process.
  const { loadLocalEnvironment } = await import("../backend/local-env.js");
  loadLocalEnvironment();
}

// Nitro builds this route into the same Node Vercel Function as the frontend.
// Express retains its existing paths locally and receives the prefix stripped here.
const handler: NodeHandler = (req, res) => {
  req.url = (req.url ?? "/").replace(/^\/api(?=\/|\?|$)/, "") || "/";
  app(req, res);
};
export default handler;
