# Codebase Structure

**Analysis Date:** 2026-02-10

## Directory Layout

```
AG-Water-Tracker/
├── .planning/                  # GSD planning output (generated)
│   └── codebase/              # Codebase analysis documents
│
├── .claude/                    # Claude subagent configurations
│   └── agents/                # Agent definitions
│
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # Architecture deep dive
│   ├── SETUP.md                # Development setup guide
│   ├── API.md                  # Database schema & API details
│   ├── task.md                 # Task breakdown (62 tasks, 10 phases)
│   ├── implementation_plan.md  # Design decisions
│   ├── powersync-sync-rules.yaml  # PowerSync sync rules documentation
│   └── MAPBOX_OFFLINE_IMPLEMENTATION.md
│
├── public/                     # Static PWA assets
│   ├── manifest.json           # PWA metadata
│   ├── icons/                  # App icons (192x192, 512x512)
│   └── robots.txt
│
├── supabase/                   # Backend configuration
│   └── migrations/             # SQL migration files
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       ├── ... (18 migrations total)
│       └── 019_phone_invite_flow.sql
│
├── src/                        # Application source code
│   ├── App.tsx                 # Root router component
│   ├── main.tsx                # Entry point (React mount)
│   ├── index.css               # Global styles (Tailwind v4 with @theme, @layer)
│   │
│   ├── components/             # Reusable UI components
│   │   ├── auth/               # Auth-specific components
│   │   │   ├── AuthLayout.tsx  # Shared auth page wrapper
│   │   │   └── OtpInput.tsx    # 6-digit OTP input field
│   │   │
│   │   ├── AppLayout.tsx        # Wraps protected routes (Header/SideMenu/PowerSync)
│   │   ├── Header.tsx           # Top navigation bar with farm name & menu toggle
│   │   ├── SideMenu.tsx         # Drawer menu (open/close state)
│   │   │
│   │   ├── MapView.tsx          # Mapbox GL map with well markers
│   │   ├── WellMarker.tsx       # Individual well marker on map
│   │   ├── LocationPickerMarker.tsx  # Marker for selected location (during well creation)
│   │   ├── UserLocationCircle.tsx    # Current user location indicator
│   │   │
│   │   ├── LocationPickerBottomSheet.tsx  # Bottom sheet for map location selection
│   │   ├── AddWellFormBottomSheet.tsx     # Bottom sheet for well creation form
│   │   ├── AddUserModal.tsx        # Modal for adding farm members (invite flow)
│   │   ├── PendingInvitesList.tsx  # List of pending farm invites
│   │   │
│   │   ├── RequireAuth.tsx      # Route guard: requires session (shows loader/offline)
│   │   ├── RequireOnboarded.tsx  # Route guard: requires profile + farm membership
│   │   │
│   │   ├── SyncStatusBanner.tsx  # PowerSync sync status indicator
│   │   ├── MapOfflineOverlay.tsx # Overlay for offline map tile errors
│   │   ├── LocationPermissionBanner.tsx  # Geolocation permission prompt
│   │   ├── OfflineMessage.tsx    # Full-screen offline message (no session)
│   │   │
│   │   ├── SegmentedControl.tsx  # Reusable segmented button control
│   │
│   ├── pages/                  # Page components (route targets)
│   │   ├── auth/               # Authentication pages
│   │   │   ├── PhonePage.tsx    # OTP request form
│   │   │   └── VerifyPage.tsx   # OTP verification form
│   │   │
│   │   ├── onboarding/         # Onboarding flow pages
│   │   │   ├── ProfilePage.tsx  # First name, last name, email entry
│   │   │   ├── CreateFarmPage.tsx  # Farm creation form
│   │   │   └── index.ts         # Onboarding exports (removed join/choice)
│   │   │
│   │   ├── DashboardPage.tsx    # Map view with well markers + FABs
│   │   ├── WellListPage.tsx     # List of wells with status indicators
│   │   ├── SettingsPage.tsx     # User settings, farm invite management
│   │   ├── ReportsPage.tsx      # Reports/analytics (placeholder)
│   │   ├── SubscriptionPage.tsx # Subscription management (placeholder)
│   │   └── LanguagePage.tsx     # Language selection (placeholder)
│   │
│   ├── hooks/                  # Custom React hooks (data & side effects)
│   │   ├── useWells.ts         # Query wells from PowerSync, type conversion
│   │   ├── useAuth.ts          # (Not found; useAuth() via AuthProvider context)
│   │   ├── useGeolocation.ts    # Get user's GPS location
│   │   ├── useGeolocationPermission.ts  # Detect permission state
│   │   ├── useOnlineStatus.ts   # Browser online/offline detection
│   │   ├── useMapTileStatus.ts  # Track map tile loading errors
│   │   ├── useUserProfile.ts    # (Mentioned in memory, not found)
│   │   └── useFarmName.ts       # (Mentioned in memory, not found)
│   │
│   ├── lib/                    # Utilities, services, contexts
│   │   ├── supabase.ts         # Supabase client initialization
│   │   ├── powersync.ts        # PowerSync instance singleton, setupPowerSync()
│   │   ├── powersync-schema.ts  # PowerSync schema definition + types
│   │   ├── powersync-connector.ts  # SupabaseConnector (handles sync uploads)
│   │   ├── PowerSyncContext.tsx    # PowerSync provider + useDatabase hook
│   │   ├── AuthProvider.tsx        # Auth state provider + useAuth hook
│   │   └── resolveNextRoute.ts     # Route resolution logic for onboarding
│   │
│   ├── stores/                 # Zustand state stores (UI state)
│   │   └── (Not yet created; planned for future use)
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── (Directory exists but empty; types defined inline)
│   │
│   ├── assets/                 # Images, icons, static files
│   │   └── (Logo/branding assets)
│   │
│   └── vite-env.d.ts           # Vite type declarations
│
├── dist/                       # Build output (generated, not committed)
├── node_modules/               # Dependencies (not committed)
│
├── .env                        # Environment variables (not committed, has secrets)
├── .env.example                # Template for .env
├── .gitignore                  # Git ignore rules
├── .mcp.json                   # MCP configuration (Claude Code context)
├── eslint.config.js            # ESLint configuration
├── package.json                # npm dependencies & scripts
├── package-lock.json           # Locked dependency versions
├── tsconfig.json               # TypeScript base config
├── tsconfig.app.json           # TypeScript app-specific config
├── tsconfig.node.json          # TypeScript build tools config
├── vite.config.ts              # Vite build configuration (includes vite-plugin-pwa)
├── CLAUDE.md                   # Project instructions (override defaults)
└── README.md                   # Project overview
```

## Directory Purposes

**src/components/**
- Purpose: Reusable React UI components (not tied to routes)
- Contains: Layout shells, forms, modals, maps, route guards, banners
- Key files: AppLayout (wraps protected routes), RequireAuth/RequireOnboarded (guards), MapView (map engine)

**src/pages/**
- Purpose: Route-level page components (one per major route)
- Contains: Login, verification, onboarding flows, app pages
- Key files: DashboardPage (map view with creation flow), WellListPage (well list), PhonePage/VerifyPage (auth)

**src/hooks/**
- Purpose: Reusable logic extraction (data queries, browser APIs, side effects)
- Contains: PowerSync queries (useWells), browser APIs (useGeolocation, useOnlineStatus), permission checks
- Pattern: Export custom hook function, often wrapping PowerSync/Supabase calls

**src/lib/**
- Purpose: Non-React utilities, service initialization, context providers
- Contains: Supabase client, PowerSync instance, auth/PowerSync contexts, route resolvers
- Key files: AuthProvider.tsx (identity), PowerSyncContext.tsx (data), powersync-connector.ts (sync logic)

**src/stores/**
- Purpose: Zustand state stores (UI state management) — not yet used
- Planning: selectedWellId, modalStates, filters, UI toggles

**supabase/migrations/**
- Purpose: Database schema evolution (version-controlled SQL)
- Contains: Table creation, RLS policies, trigger functions, farm invite flow
- Pattern: Numbered files (001, 002, etc.), deployed by Supabase CLI

**docs/**
- Purpose: Architecture, setup, and task documentation
- Key files: ARCHITECTURE.md (full deep dive), task.md (62 tasks across 10 phases), API.md (schema details)

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app mount point (calls createRoot)
- `src/App.tsx`: Router root (defines all routes and guards)
- `src/lib/AuthProvider.tsx`: Auth initialization (fetches session, onboarding status on app load)
- `src/components/AppLayout.tsx`: PowerSync initialization (only for protected routes)

**Configuration:**
- `vite.config.ts`: Vite build config (includes @tailwindcss/vite for Tailwind v4)
- `tsconfig.app.json`: TypeScript compiler options
- `.env`: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_POWERSYNC_URL, VITE_MAPBOX_TOKEN)
- `eslint.config.js`: ESLint rules

**Core Logic:**
- `src/lib/powersync.ts`: PowerSync singleton, setupPowerSync() call
- `src/lib/powersync-connector.ts`: Upload logic (maps CRUD to Supabase)
- `src/lib/AuthProvider.tsx`: Auth flow (OTP, onboarding status)
- `src/hooks/useWells.ts`: Well data fetching from PowerSync

**Routing & Access Control:**
- `src/App.tsx`: All routes defined here
- `src/components/RequireAuth.tsx`: Checks session
- `src/components/RequireOnboarded.tsx`: Checks profile + farm membership
- `src/lib/resolveNextRoute.ts`: Utility for routing logic

**Testing:**
- `vitest.config.ts` (if used): Test configuration
- `src/**/*.test.ts` or `src/**/*.spec.ts` (not found — no tests currently)

## Naming Conventions

**Files:**
- Components: PascalCase (e.g., MapView.tsx, WellMarker.tsx)
- Hooks: camelCase starting with 'use' (e.g., useWells.ts, useGeolocation.ts)
- Utils/Services: camelCase (e.g., supabase.ts, powersync.ts)
- Types: PascalCase in .ts files (e.g., Well, Farm, WellWithReading)
- Pages: PascalCase (e.g., DashboardPage.tsx, ProfilePage.tsx)

**Functions:**
- Components: PascalCase (function names match file names)
- Hooks: camelCase (useWells, useAuth, etc.)
- Utils: camelCase (setupPowerSync, disconnectAndClear)
- Handlers: camelCase (handleSaveWell, handleMapClick)

**Variables:**
- Constants: UPPER_SNAKE_CASE (DEFAULT_ZOOM, LONG_PRESS_DURATION)
- State/Props: camelCase (farmName, isLoading, onWellClick)
- Booleans: prefix with 'is', 'has', 'can', 'should' (isLoading, hasProfile, canWrite)
- Refs: camelCase with 'Ref' suffix (mapRef, pressTimerRef, errorTimeoutRef)

**Types:**
- Interfaces: PascalCase (WellWithReading, OnboardingStatus, AuthContextType)
- Generic parameters: Single letters (T, K, V) or PascalCase (RowType)
- Export pattern: `type DatabaseType = (typeof AppSchema)['types']`

**Directories:**
- Lowercase, plural when containing multiple items (components, pages, hooks, lib)
- Feature-grouped subdirs: auth, onboarding (lowercase)

## Where to Add New Code

**New Feature (e.g., "Add well readings page"):**
- Primary code: `src/pages/ReadingHistoryPage.tsx` (new page)
- Data hook: `src/hooks/useWellReadings.ts` (new hook to query readings from PowerSync)
- Components: `src/components/ReadingForm.tsx` (new form component if needed)
- Route: Add to `src/App.tsx` under protected routes

**New Component/Module (e.g., "Reusable form input"):**
- Implementation: `src/components/FormInput.tsx` (new component)
- Pattern: Export default function, accept props, compose with other components
- Export from: Component file directly (no barrel files currently)

**Utilities (e.g., "Acre-feet to gallons converter"):**
- Shared helpers: `src/lib/unitConversions.ts` (new utility file)
- Tests: `src/lib/__tests__/unitConversions.test.ts` (if testing)
- Export: Named exports from file, import by name in consumers

**New Hook (e.g., "useWellReadings"):**
- Location: `src/hooks/useWellReadings.ts`
- Pattern: Query PowerSync with `useQuery()`, memoize mapped results with `useMemo()`
- Guard empty queries: Use `'SELECT NULL WHERE 0'` instead of empty string
- Export typed interface (e.g., `ReadingWithMetadata[]`)

**New Page:**
- Location: `src/pages/[FeatureName]Page.tsx`
- Protection: If requires auth, add route under RequireAuth layer in App.tsx
- Protection: If requires onboarding, nest under RequireOnboarded layer
- Data: Use custom hooks (useWells, etc.) not direct db queries
- Layout: Wrap with AppLayout if needs Header/SideMenu

**Zustand Store (when created):**
- Location: `src/stores/[featureName]Store.ts`
- Pattern: `create((set) => ({ state, actions }))` with persist middleware
- Export: Named export of store hook (e.g., `useWellsStore`)

**Database Migration:**
- Location: `supabase/migrations/[number]_[description].sql`
- Naming: Increment number, use snake_case description
- Content: CREATE TABLE, ADD COLUMN, CREATE POLICY, etc.
- Deploy: Via Supabase CLI (`supabase migration up`)

## Special Directories

**dist/**
- Purpose: Compiled build output
- Generated: Yes (npm run build)
- Committed: No (.gitignore)

**node_modules/**
- Purpose: Installed npm dependencies
- Generated: Yes (npm install)
- Committed: No (.gitignore)

**public/**
- Purpose: Static files served as-is (PWA manifest, icons)
- Generated: No (hand-created)
- Committed: Yes
- Special: index.html served as SPA entry point

**supabase/migrations/**
- Purpose: Version-controlled database schema changes
- Generated: No (hand-written SQL)
- Committed: Yes (important for reproduction)

**.claude/**
- Purpose: Claude Code subagent definitions
- Generated: No (user-defined)
- Committed: Yes

**.planning/**
- Purpose: GSD (Guided Software Development) planning output
- Generated: Yes (by /gsd:* commands)
- Committed: No (.gitignore)

**docs/**
- Purpose: Human-readable project documentation
- Generated: No (maintained by team)
- Committed: Yes

## Code Layout Patterns

**Component Structure (Basic):**
```tsx
// src/components/WellMarker.tsx
import { useMemo, useCallback } from 'react';
import { WellWithReading } from '../hooks/useWells';

interface WellMarkerProps {
  well: WellWithReading;
  onClick?: (wellId: string) => void;
}

export default function WellMarker({ well, onClick }: WellMarkerProps) {
  const handleClick = useCallback(() => {
    onClick?.(well.id);
  }, [well.id, onClick]);

  return <div onClick={handleClick}>{well.name}</div>;
}
```

**Page Structure:**
```tsx
// src/pages/DashboardPage.tsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { usePowerSync } from '@powersync/react';
import MapView from '../components/MapView';
import { useWells } from '../hooks/useWells';
import { useAuth } from '../lib/AuthProvider';

export default function DashboardPage() {
  const { wells } = useWells();
  const { onboardingStatus } = useAuth();
  // ... page logic

  return <div>{/* JSX */}</div>;
}
```

**Hook Structure:**
```ts
// src/hooks/useWells.ts
import { useMemo } from 'react';
import { useQuery } from '@powersync/react';
import { useAuth } from '../lib/AuthProvider';

export function useWells() {
  const { onboardingStatus } = useAuth();
  const farmId = onboardingStatus?.farmId ?? null;

  const query = farmId
    ? `SELECT * FROM wells WHERE farm_id = ?`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<WellRow>(query, farmId ? [farmId] : []);

  const wells = useMemo(() =>
    (data ?? []).map(row => ({ /* transform */ })),
    [data]
  );

  return { wells, loading: isLoading, error };
}
```

**Guard Structure:**
```tsx
// src/components/RequireAuth.tsx
import { Outlet, Navigate } from 'react-router';
import { useAuth } from '../lib/AuthProvider';

export default function RequireAuth() {
  const { isAuthReady, session } = useAuth();

  if (!isAuthReady) return <LoadingScreen />;
  if (!session) return <Navigate to="/auth/phone" />;

  return <Outlet />;
}
```

---

*Structure analysis: 2026-02-10*
