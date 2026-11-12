import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const backendRequire = createRequire(new URL("./backend/package.json", import.meta.url));
const swaggerAssets = dirname(backendRequire.resolve("swagger-ui-dist/package.json"));

export default defineConfig({
  server: {
    port: 8080,
    host: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart(),
    nitro({
      publicAssets: [
        { dir: swaggerAssets, baseURL: "/api/api-docs", maxAge: 3600, ignore: ["**/*.map"] },
      ],
      routes: {
        "/api/**": { handler: "./server/api.ts", format: "node" },
        "/api": { handler: "./server/api.ts", format: "node" },
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
