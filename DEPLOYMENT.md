# TaskFlow on Vercel

This handoff is a deployment guide only; the repository has not been deployed.

The frontend and Express API share one project and origin. Nitro compiles the
`/api/**` route in `server/api.ts` into its Node Vercel Function, alongside
TanStack Start. No competing SPA rewrites or second catch-all function are used.
The route explicitly declares `format: "node"`, allowing Nitro to select the
compatible Node entry instead of trying to call Express from a web-only handler.
This follows the [TanStack Start Vercel integration](https://vercel.com/docs/frameworks/full-stack/tanstack-start)
and [Nitro routing](https://nitro.build/docs/routing).

## Project settings

- Root directory: repository root. Framework: TanStack Start.
- Node.js: 22.x. Install: `bun install --frozen-lockfile`. Build: `bun run build`.
- Keep output directory automatic; Nitro selects the Vercel preset on Vercel.
- Root Bun workspace includes `backend`, so backend packages are installed and
  traced into the function. `backend/index.js` is only the local/Render entry.
- Use a function region close to MongoDB where available on your plan.
- The repository contains deployment configuration, not a live deployment.

## Free-tier setup for a personal project

Vercel Hobby is free for personal, non-commercial projects. It has usage caps;
when a cap is reached, features may be limited until the usage window resets.
Hobby accounts cannot purchase additional usage, so this setup does not require
turning on metered overages. Do not use this plan for commercial service. See the
[Vercel Hobby plan and current limits](https://vercel.com/docs/plans/hobby) and
[Vercel pricing and usage policy](https://vercel.com/pricing).

MongoDB Atlas offers a Free cluster (M0) for small projects. It has storage,
performance, and feature limits; it is not a production-capacity guarantee. Review
[MongoDB's Free cluster setup](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/)
and [current Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/).
Use Vercel's free `vercel.app` hostname. A custom domain is not required.

Manual setup, with no paid upgrade or trial:

1. Create a Vercel project from this repository and leave the root directory and
   automatic Nitro output settings as described above. Select Hobby and do not
   start a Pro trial or enable paid usage.
2. Create an Atlas Free (M0) cluster. Create a database user and configure Atlas
   network access for the deployed function. Copy the Atlas connection string.
3. In Vercel project settings, add `MONGODB_URI`, `JWT_SECRET`, and
   `FRONTEND_URL` for the environment you intend to use. Set `FRONTEND_URL` to
   the assigned `https://<project>.vercel.app` origin. Keep secrets server-only;
   do not add a `VITE_` prefix. `VITE_API_URL` is unused.
4. Deploy only after reviewing the plan, usage caps, and environment values.
   The remaining project owner action is to configure those provider accounts,
   then run a preview smoke test; this repository has not been deployed.

Provider pricing, eligibility, and free-tier limits can change. Recheck the
official plan pages above before creating accounts or changing a plan.

## Environment variables

Set these in the Vercel project for the intended Production/Preview environments:

| Variable       | Placeholder / purpose                                                             |
| -------------- | --------------------------------------------------------------------------------- |
| `MONGODB_URI`  | `mongodb+srv://USERNAME:PASSWORD@CLUSTER.example/task-api`                        |
| `JWT_SECRET`   | A long random secret, server-only                                                 |
| `FRONTEND_URL` | `https://your-project.vercel.app`, for cross-origin CORS compatibility            |
| `VITE_API_URL` | Not used. Browser requests always use relative `/api`, including LAN development. |

Never prefix database credentials or the JWT secret with `VITE_`. If retaining
existing logins during migration, use the existing server JWT secret securely.
Allow the deployment's connection path in MongoDB Atlas network access and keep
the database user permissions scoped to the app database. Redeploy after changing
build-time frontend variables. No keep-alive pings are needed.

## Verification before switching away from Render

1. Build locally with `NITRO_PRESET=vercel` to inspect `.vercel/output/config.json`
   and its generated Node function. Local default builds still use node-server.
2. After configuring provider accounts and server variables, deploy a Vercel
   Preview to test the integration. No preview has been deployed in this work.
3. Check `/api/health`, `/api/openapi.json`, and `/api/api-docs/` (including assets).
4. Register/login with a test account, then create, list, edit checklist/status,
   and delete a test task. Verify a second account cannot read the first's tasks.
5. Confirm production network requests use `/api/auth/...` and `/api/tasks`.
6. Check refresh, auth redirects, focus recovery, and logout to the public Home page.

Render remains a fallback; no Render configuration was removed. Changing the
frontend API default removes the dependency on Render's sleeping process, but
Vercel Functions and MongoDB can still have cold-start/network latency. This is
not a promise of zero cold starts or a guarantee of a particular hosting quota.

## Local development

Run `bun install` in the root. Copy placeholders from the example files into your
local environment and fill them privately. Run `node index.js` in `backend/` with
MongoDB configured, and `bun run dev` at the root. Vite runs on 8080; local API
requests use same-origin `/api`. Vite serves on all local interfaces. The API entry
loads `backend/.env` in its own development process only; no server secret is exposed to the
browser. Open the Network URL printed by Vite on another Wi-Fi device. No LAN IP
is stored in configuration. Standalone backend development still uses port 3000;
its Swagger remains `/api-docs/` locally. Do not use the standalone port as a
browser API base URL.

MongoDB connections reuse one promise/pool across warm invocations, retry after
connection failure, and time out selection after eight seconds. API fetches stop
after 15 seconds and offer retry UI instead of indefinite skeletons.

## Product limitations

- No live Vercel deployment has been performed. The Vercel output was built and
  tested locally with the repository verification script.
- Forgotten-password email recovery needs an external email provider and is not
  available in this project.
- Timer sound depends on browser audio support and user activation/permissions.
  Browser notifications require support and permission. Neither is guaranteed
  after the browser is fully closed; the app checks for an elapsed session when
  it resumes.
- Responsive screens were checked in desktop browser emulation. A physical
  iPhone Safari sound check remains for the owner.

## Checks

```sh
bunx prettier --write .
bunx tsc --noEmit
bun run test
bun run build
bun run lint
bun run --cwd backend test
node scripts/verify-vercel.mjs
```

Backend tests use HTTP smoke checks and a mocked connection attempt, not a live
database or real credentials. A deployed MongoDB CRUD check still requires the
external environment steps above. Regenerate branding with
`python scripts/generate-icons.py` (build-time Pillow only).

`verify-vercel.mjs` requires a Vercel-preset build first. It invokes the generated
Node function locally with separate request sockets, checks API paths, the JWT
gate, public SSR, runtime metadata, and packaged Swagger assets. It does not
publish anything or connect to MongoDB.
