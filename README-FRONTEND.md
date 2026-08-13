# Furnix Estimates — Frontend

React 18 · TypeScript · Tailwind v4 · Vite · React Query v5 · React Router v6

## What's inside

```
apps/web/src/
├── pages/          EstimateDashboard · EstimateCreate · EstimateEdit · EstimatePreview
│                   EstimateDetail · ModuleMaster · TermsMaster · PricingSettings · SignIn
├── components/
│   ├── estimate/   EstimateForm · ModuleSelector · HostingModelPicker
│   │               PricingLedger · AdvancedPricingControl · TermsBuilder · StatusBadge
│   ├── layout/     AppShell
│   └── ui/         Button · Input · Select · Card · Badge · Modal · Toast
│                   + loading / empty / error states
├── hooks/          useEstimates · useModules · useTerms · useSettings · useAuth
├── lib/            api (fetch wrapper + envelope unwrap) · queryClient · format
├── types/          mirrors the API response shapes
└── index.css       design tokens

packages/shared/    the pricing engine — see the note below
```

## Run

```bash
pnpm install
pnpm --filter @furnix/shared build      # required: the web app imports its dist
pnpm --filter @furnix/web dev           # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:4000` in development, so no env file is
needed locally. For a deployed API, set `VITE_API_URL` in `apps/web/.env` to the
full base URL including `/api/v1`.

Typecheck with `pnpm --filter @furnix/web typecheck`.

## The shared package

`packages/shared` also ships in the backend bundle. It is the same code in both,
deliberately: `calculateEstimate()` runs in the browser on every keystroke and on
the server before every write, so the figure the salesperson watches while typing
is the figure that lands in PostgreSQL and on the PDF.

**Keep the two copies identical.** If they drift, the UI and the database start
disagreeing about money and nothing will tell you. Once both bundles are merged
into one repo, delete the duplicate and keep a single `packages/shared`.

## Design tokens

Defined in `src/index.css` under `@theme`, pulled from furnixcrm.com — warm
near-black `#14110F`, paper canvas `#F7F5F2`, brand gold `#B4893A` used only on
the estimate number and the monthly payable. Montserrat for display, Inter for
UI, IBM Plex Mono with tabular figures for every monetary value.

## Ledger behaviour worth knowing

`PricingLedger.tsx` renders two settlements — one-time and monthly — in separate
blocks that are never summed. `AdvancedPricingControl.tsx` (the overflow menu on
the ledger header) only mounts for roles holding `estimate:adjustment:manage`,
and the adjustment rows only render for `estimate:adjustment:view`. The server
enforces both independently; the UI checks are for clarity, not security.
