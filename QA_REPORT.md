# TaskFlow verification report

Updated 2026-11-12 (Asia/Riyadh). All work remains local and uncommitted.
Existing unrelated changes were preserved. No commit, push, or deployment was performed.

## Responsive UX and networking

- Below 768px, the public Home page is a three-step introduction inside 100dvh.
  Welcome, Next Move plus a 25-minute Focus Session, and Calendar plus Reminders
  are available through Next/Back, progress dots, Skip/Log in, native touch swipe,
  arrow keys, Home/End, and a final Get started link. It includes safe-area padding,
  reduced-motion support, and clearly distinguishes the welcome experience.
- Desktop/tablet retain the full marketing page. Shared auth spacing is tighter on
  mobile. Remember me uses a native 22px mobile checkbox with a 10px gap and a
  larger label hit target; desktop control size remains 20px.
- Browser API calls always use relative /api. Obsolete VITE_API_URL values cannot
  direct a phone to localhost. Vite binds to all interfaces; the API entry loads
  backend/.env in its own development process only. Production uses injected
  environment variables. Same-origin CORS follows the incoming host, while the
  configured cross-origin policy remains available. No LAN IP is hardcoded.
- Focus Session replaces Focus Sprint. Users can choose another incomplete task,
  or focus from an eligible task card. Starting pending work saves In Progress
  before starting the timer; failures preserve the previous session. Switching an
  active task requires confirmation. Completed work cannot be selected.
- A global provider preserves the session across Dashboard, Calendar, and
  Notifications. Desktop reserves space for an always-visible side panel. Mobile
  has a safe-area bottom bar that expands into task details and controls. The
  timer, pause/resume, checklist, completion, and user-scoped refresh persistence
  remain available. Only End Session removes it. Existing saved sessions migrate.
- Desktop navigation remains fixed. The mobile hamburger drawer closes on link
  navigation. Task and calendar layouts respond to the content width available
  beside the focus panel rather than forcing narrow desktop columns.
- Prior reminder-only time wheels, styled Radix selects, validation, public routes,
  original logo/icons, Next Move ranking, calendar, Express ESM, and Vercel support
  remain intact.

## Actual runtime and browser results

Headless Edge used the real Wi-Fi Network URL http://192.168.100.32:8080, with
mobile emulation at 320x568, 375x667, 390x844, and 430x932; full landing and
persistent panel checks used 1024x900 and 1440x900. The main LAN run captured
27 screenshots. Representative screenshots were visually inspected. Additional
checks exercised native touch events, keyboard onboarding, checkbox sizes, and
fixed sidebar position after scrolling. This was not a physical second-device test.

- Every onboarding slide fit without vertical scrolling at all four mobile sizes.
- No document horizontal overflow or page JavaScript exceptions were observed in
  the checked scenarios. The final hydrated-page pass also reported zero hydration warnings.
- Real registration returned 201; real login returned 200. Tasks were created (201),
  updated (200), and deleted (200). Health returned 200. Every observed browser API
  request used the LAN frontend origin, never a loopback API URL.
- Real Focus Session checks covered task choice, pending-to-In Progress status,
  checklist updates, mobile bar/details, desktop panel, navigation, refresh without
  timer reset, pause/resume, confirmed task replacement, completed-task exclusion,
  and End Session. Drawer navigation closed correctly.
- Temporary QA accounts and all associated tasks were deleted after each real
  database test. Existing user records were not modified. No secrets were printed.
- Screenshots, browser scripts, and machine-readable LAN results remain in ignored
  .qa/. Builds and those local tools are not part of the source change set.

## Verification

| Check                             | Actual result                                                        |
| --------------------------------- | -------------------------------------------------------------------- |
| bunx prettier --write .           | Passed                                                               |
| bunx tsc --noEmit                 | Passed                                                               |
| bun run test                      | 32 passed across 7 files                                             |
| Backend npm test                  | 8 passed across 2 files                                              |
| bun run build                     | Passed                                                               |
| NITRO_PRESET=vercel bun run build | Passed, generated Node 22 function                                   |
| node scripts/verify-vercel.mjs    | Passed against fresh generated output                                |
| bun run lint                      | Zero errors; 6 pre-existing Fast Refresh warnings                    |
| Build secret/packaging check      | 239 files checked; no embedded private values or packaged .env files |
| git diff --check                  | Passed                                                               |

Fast Refresh warnings remain in the existing badge, button, form,
navigation-menu, sidebar, and toggle UI files. The new modules introduce no
Fast Refresh warning. Backend regressions cover native ESM/Vite SSR imports,
server-local environment loading without overriding injected values, JWT gates,
connection reuse/retry, CORS, and health/docs. New frontend tests cover onboarding
navigation, relative API URLs despite stale configuration, focus start/status,
switch confirmation, failed saves, completion/end, navigation, and timer recovery.

## Files changed in this responsive/networking pass

- `.env.example`
- `DEPLOYMENT.md`
- `README.md`
- `QA_REPORT.md`
- `backend/app.js`
- `backend/local-env.js`
- `backend/local-env.d.ts`
- `backend/test/api.test.js`
- `backend/test/esm.test.js`
- `server/api.ts`
- `vite.config.ts`
- `src/lib/api.ts`
- `src/hooks/use-focus-session.ts`
- `src/components/taskflow/MobileWelcome.tsx`
- `src/components/taskflow/FocusSession.tsx`
- `src/components/taskflow/AuthLayout.tsx`
- `src/components/taskflow/AppShell.tsx`
- `src/components/taskflow/NextMove.tsx`
- `src/components/taskflow/TaskCard.tsx`
- `src/routes/__root.tsx`
- `src/routes/index.tsx`
- `src/routes/login.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/calendar.tsx`
- `src/styles.css`
- `src/test/api-origin.test.ts`
- `src/test/mobile-welcome.test.tsx`
- `src/test/focus-session.test.tsx`

Replaced `src/components/taskflow/FocusSprint.tsx` with `FocusSession.tsx`. Existing timer helpers and the storage key were retained for compatibility.

## Remaining external verification

No live Vercel deployment was made. The generated function was built and invoked
locally, including health, OpenAPI, Swagger assets, unauthenticated tasks, 404,
Home SSR, and login SSR. A real Vercel Preview still needs server environment
variables and database access, then authenticated deployed smoke testing. See
[DEPLOYMENT.md](DEPLOYMENT.md). No zero-cold-start claim is made.

## Complete accumulated repository source change set

This includes the preserved work from earlier requests, not only this pass.

- `.env.example`
- `.gitignore`
- `.prettierignore`
- `DEPLOYMENT.md`
- `QA_REPORT.md`
- `README.md`
- `backend/.env.example`
- `backend/app.d.ts`
- `backend/app.js`
- `backend/db.js`
- `backend/index.js`
- `backend/local-env.d.ts`
- `backend/local-env.js`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/swagger.js`
- `backend/test/api.test.js`
- `backend/test/esm.test.js`
- `bun.lock`
- `eslint.config.js`
- `package.json`
- `public/apple-touch-icon.png`
- `public/favicon.ico`
- `public/favicon.svg`
- `public/icon-192.png`
- `public/icon-512.png`
- `public/icon-maskable-512.png`
- `public/site.webmanifest`
- `scripts/generate-icons.py`
- `scripts/verify-vercel.mjs`
- `server/api.ts`
- `src/components/taskflow/AppShell.tsx`
- `src/components/taskflow/AuthLayout.tsx`
- `src/components/taskflow/FocusSession.tsx`
- `src/components/taskflow/Logo.tsx`
- `src/components/taskflow/MobileWelcome.tsx`
- `src/components/taskflow/NextMove.tsx`
- `src/components/taskflow/SummaryCards.tsx`
- `src/components/taskflow/TaskCard.tsx`
- `src/components/taskflow/TaskFormDialog.tsx`
- `src/components/taskflow/TaskStates.tsx`
- `src/components/taskflow/TaskToolbar.tsx`
- `src/components/taskflow/TimeWheelPicker.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/select.tsx`
- `src/hooks/use-focus-session.ts`
- `src/lib/api.ts`
- `src/lib/auth-guard.ts`
- `src/lib/planning.ts`
- `src/routes/__root.tsx`
- `src/routes/calendar.tsx`
- `src/routes/dashboard.tsx`
- `src/routes/index.tsx`
- `src/routes/login.tsx`
- `src/routes/notifications.tsx`
- `src/styles.css`
- `src/test/api-origin.test.ts`
- `src/test/app-routing.test.tsx`
- `src/test/focus-session.test.tsx`
- `src/test/mobile-welcome.test.tsx`
- `src/test/planning.test.ts`
- `src/test/taskflow-rules.test.ts`
- `src/test/time-wheel-picker.test.tsx`
- `tsconfig.json`
- `vercel.json`
- `vite.config.ts`
