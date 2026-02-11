# Technology Stack

**Analysis Date:** 2026-02-10

## Languages

**Primary:**
- TypeScript 5.9.3 - Full project codebase (frontend, configs, migrations)
- SQL - Supabase migrations and RLS policies (`supabase/migrations/`)

**Secondary:**
- JavaScript - Vite config and ESLint configuration
- CSS - Tailwind CSS v4 via `@import "tailwindcss"` with `@theme` custom colors in `src/index.css`

## Runtime

**Environment:**
- Node.js (no specific version pinned; project uses ESM modules)

**Package Manager:**
- npm (uses `package-lock.json`)
- Lockfile: present at `package-lock.json`

## Frameworks

**Core:**
- React 19.2.0 - UI framework
- React Router 7.13.0 - Routing (`src/App.tsx` defines route structure)
- Vite 6.4.1 - Build tool and dev server

**Data & Sync:**
- PowerSync 1.32.0 (`@powersync/web`) - Offline-first data sync with local SQLite
- PowerSync React bindings 1.8.2 (`@powersync/react`) - React hooks integration
- @journeyapps/wa-sqlite 1.4.1 - WebAssembly SQLite for local database

**Backend:**
- Supabase 2.93.3 (`@supabase/supabase-js`) - PostgreSQL backend, Auth, RLS policies

**Maps:**
- Mapbox GL JS 3.18.1 - Vector tile rendering
- react-map-gl 8.1.0 - React wrapper for Mapbox
- @turf/circle 7.3.3 - Geospatial calculations (circular buffers)

**UI Components:**
- Headless UI 2.2.9 - Unstyled, accessible component primitives
- Heroicons 2.2.0 - Icon library (`@heroicons/react/24/outline` and `/24/solid`)

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- @tailwindcss/vite 4.1.18 - Vite integration for Tailwind

**PWA:**
- vite-plugin-pwa 1.2.0 - Progressive Web App support with Workbox caching

## Key Dependencies

**Critical:**
- `@powersync/web` (1.32.0) - Offline sync engine; excluded from Vite optimization
- `@journeyapps/wa-sqlite` (1.4.1) - Local SQLite database; excluded from Vite optimization
- `mapbox-gl` (3.18.1) - Maps; requires `VITE_MAPBOX_TOKEN` in `.env`
- `@supabase/supabase-js` (2.93.3) - Backend API client; requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Infrastructure:**
- `react-dom` (19.2.0) - React rendering
- `react-router` (7.13.0) - Client-side routing

## Configuration

**Environment:**
- Vite-based environment variables via `import.meta.env.VITE_*`
- Required vars (see `.env.example`):
  - `VITE_SUPABASE_URL` - PostgreSQL backend endpoint
  - `VITE_SUPABASE_ANON_KEY` - Anonymous auth key for Supabase
  - `VITE_POWERSYNC_URL` - PowerSync service endpoint
  - `VITE_MAPBOX_TOKEN` - Mapbox API token (optional; can use OpenStreetMap fallback)
  - `VITE_GPS_RANGE_METERS` - GPS verification range (default 100m)

**Build:**
- `vite.config.ts` - Vite configuration with React, Tailwind, and PWA plugins
- `tsconfig.json` - Base TypeScript config with references
- `tsconfig.app.json` - App TypeScript config (ES2022 target, strict mode enabled)
- `eslint.config.js` - ESLint flat config with React, TypeScript, and hooks rules

## Platform Requirements

**Development:**
- Node.js runtime (npm installed)
- TypeScript compiler
- Browser with WebAssembly support (for SQLite)
- Geolocation API support (for well location features)

**Production:**
- Browser with ES2022 support
- WebAssembly support (wa-sqlite)
- Service Worker support (PWA)
- Mapbox account and API token (or OpenStreetMap fallback)
- Supabase PostgreSQL instance
- PowerSync service instance

## Optimizations & Special Configuration

**Vite Optimizations:**
- `optimizeDeps.exclude`: `@journeyapps/wa-sqlite`, `@powersync/web` (pre-bundled to avoid CommonJS issues)
- `worker.format: 'es'` - Ensures Web Worker uses ES modules

**PWA Caching Strategy:**
- Mapbox API requests: 7-day cache (CacheFirst)
- Mapbox tiles: 7-day cache (CacheFirst)
- Mapbox assets (fonts/sprites): 30-day cache (CacheFirst)
- Workbox max file size: 5MB

**Database:** Local SQLite via wa-sqlite, synced with Supabase via PowerSync connector

---

*Stack analysis: 2026-02-10*
