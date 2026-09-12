# Block Planning Console — SIH26027

AI-assisted railway maintenance block planning frontend. Built with React +
Vite + Tailwind CSS + React Router. Currently running entirely on mock data
(`src/data/mockData.js` via `src/services/api.js`) so it's independent of the
FastAPI backend until that's ready.

## Run it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## What's implemented right now

- Full project scaffold: Vite + Tailwind config with a dark control-room
  design system (`tailwind.config.js` — surface/ink/ai/rail/healthy/warning/
  critical tokens).
- Routing shell (`App.jsx` + `layouts/MainLayout.jsx`) with sidebar + header,
  and all 12 pages navigable.
- Reusable component library in `src/components/common/` (KpiCard,
  StatusBadge, DataTable, Modal, SidePanel, FilterBar, Button, Loading/Empty/
  ErrorState, SectionHeader, Tag, PagePlaceholder).
- Full **Dashboard** page: KPIs, data-source status strip, AI recommended
  block with "why this block?" reasoning, corridor overview, recent alerts.
- Mock API layer in `src/services/api.js` mirroring the target FastAPI
  contract (`/tasks`, `/blocks`, `/plans/generate`, `/simulation`, etc.) —
  every function is a drop-in swap to `axios` calls later.
- All other pages (Data Processing, Maintenance Records, Block Requests, AI
  Block Planner, Train Timeline, Plans, What-if Simulator, Analytics,
  Alerts, Reports, Settings) are stubbed with `PagePlaceholder` so the app
  is fully navigable today, and will be built out page-by-page next.

## Swapping in the real backend later

Everything goes through `src/services/api.js`. Flip `USE_MOCK` to `false`
and fill in the `httpClient` (axios) calls that are already sketched next to
each mock branch — no page or component needs to change.
