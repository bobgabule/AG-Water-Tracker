# AG Water Tracker - Project Instructions

## Tech Stack
- **Frontend**: React 19 + TypeScript (Vite 6)
- **Styling**: Tailwind CSS v4 (CSS-first config via `@theme` in `src/index.css`)
- **State**: Zustand v5 (UI state), PowerSync (data/offline sync)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Maps**: Mapbox GL JS via `react-map-gl/mapbox` v8
- **UI Components**: Headless UI v2, Heroicons
- **Routing**: React Router v7
- **PWA**: vite-plugin-pwa

## Subagent Workflow

After every major write process (creating or modifying multiple files), invoke the `code-reviewer` subagent before moving on. This is mandatory.

### How to invoke
```
Use the code-reviewer agent to review [list of files that were created/modified]
```

### What it does
- Reads all specified files with zero prior context (objective evaluation)
- Checks for: efficiency, correctness, best practices, security
- Returns structured findings: CRITICAL / WARNING / SUGGESTION
- Runs on `sonnet` model (fast, cost-effective, isolated from main context)

### After the review
- Fix all CRITICAL issues immediately
- Fix WARNING issues unless there's a documented reason to skip
- Apply SUGGESTION fixes at your discretion
- Run `npx tsc -b --noEmit` after fixes to verify no type errors

## Key Conventions

### Imports
- Use `react-map-gl/mapbox` (not `react-map-gl`) for Mapbox GL v8
- Use `@headlessui/react` v2 transition props (`data-[closed]:` attributes)
- Import Heroicons from `@heroicons/react/24/outline` or `/24/solid`

### PowerSync Queries
- Use `useQuery<RowType>(sql, params)` from `@powersync/react`
- Always memoize mapped results with `useMemo(() => ..., [data])`
- Guard empty queries: `'SELECT NULL WHERE 0'` instead of empty string

### Performance
- Wrap map markers and frequently re-rendered components in `React.memo`
- Use `useCallback` for all handler props passed to child components
- Avoid inline arrow functions as props in render

### Authentication
- Auth method: Phone OTP via Supabase
- `useAuth()` provides: `user`, `userProfile`, `signOut`, etc.
- `userProfile.farm_id` links to the user's farm

## Project Structure
```
src/
  components/    # React components
  hooks/         # Custom React hooks
  lib/           # Utilities, contexts, services
  pages/         # Route page components
  stores/        # Zustand state stores
  types/         # TypeScript type definitions
```

## Documentation
- `docs/task.md` — Full task breakdown (62 tasks across 10 phases)
- `docs/implementation_plan.md` — Architecture and design decisions
- `docs/ARCHITECTURE.md` — Component hierarchy, data flow, folder structure
- `docs/API.md` — Database schema and API details
- `docs/SETUP.md` — Development environment setup
