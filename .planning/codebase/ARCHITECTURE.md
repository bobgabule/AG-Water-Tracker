# Architecture

**Analysis Date:** 2026-02-10

## Pattern Overview

**Overall:** Offline-first PWA using React + PowerSync for local-first data sync

**Key Characteristics:**
- **Client-first design**: PowerSync SQLite database on device, Supabase as source of truth
- **Multi-layer authentication**: Phone OTP via Supabase Auth, Farm membership gating
- **Route-based access control**: Guards at route level (RequireAuth, RequireOnboarded)
- **Real-time sync**: WebSocket-based sync between client and server with automatic CRUD upload queue
- **Hybrid state management**: PowerSync for data, Zustand for UI state (planned), React Context for auth/services

## Layers

**Presentation Layer:**
- Purpose: UI components and page routing
- Location: `src/components/`, `src/pages/`
- Contains: React components, modals, forms, map views
- Depends on: Custom hooks (useWells, useAuth, etc.), Router
- Used by: React DOM rendering

**State & Data Layer:**
- Purpose: Client-side data management and synchronization
- Location: `src/lib/PowerSyncContext.tsx`, `src/lib/powersync.ts`, `src/lib/powersync-connector.ts`
- Contains: PowerSync database setup, schema definition, Supabase sync connector
- Depends on: @powersync/web, Supabase client
- Used by: All data-consuming components via useQuery hooks

**Authentication Layer:**
- Purpose: User identity, session, and onboarding state management
- Location: `src/lib/AuthProvider.tsx`
- Contains: Phone OTP flow, session management, onboarding status tracking
- Depends on: Supabase Auth
- Used by: Route guards, all authenticated pages

**Service/Integration Layer:**
- Purpose: External service integration
- Location: `src/lib/supabase.ts`
- Contains: Supabase client initialization
- Depends on: Supabase JS SDK, environment variables
- Used by: AuthProvider, PowerSync connector

**Hook Layer:**
- Purpose: Encapsulate data queries and side effects
- Location: `src/hooks/`
- Contains: useWells, useAuth, useGeolocation, useOnlineStatus, useMapTileStatus
- Depends on: PowerSync, React Context, Browser APIs
- Used by: Page and component level

## Data Flow

**New Well Creation (Dashboard):**

1. User clicks "New Well" → LocationPickerBottomSheet opens
2. User picks location on map or enters GPS → LocationPickerMarker shows
3. User proceeds to form → AddWellFormBottomSheet opens with location prefilled
4. User fills form data (name, meter serial, units, etc.) → handleSaveWell called
5. PowerSync executes INSERT into local SQLite: `db.execute("INSERT INTO wells...")`
6. Well immediately appears in UI (from local query)
7. PowerSync connector queues upload via `uploadData()`
8. When online, connector applies CRUD operations to Supabase via upsert
9. Server sync pulls changes down to other devices via WebSocket

**Key files:**
- `src/pages/DashboardPage.tsx` (orchestration)
- `src/components/LocationPickerBottomSheet.tsx` (location picking)
- `src/components/AddWellFormBottomSheet.tsx` (form)
- `src/lib/powersync-connector.ts` (upload logic, lines 57-75)

**Well List Querying:**

1. Component renders `useWells()` hook
2. useWells queries PowerSync: `useQuery("SELECT * FROM wells WHERE farm_id = ?", [farmId])`
3. Guard prevents query if farmId is null: `'SELECT NULL WHERE 0'`
4. Results mapped and memoized: `useMemo(() => data.map(...), [data])`
5. Boolean conversion: `send_monthly_report: row.send_monthly_report === 1`
6. Component receives typed `WellWithReading[]`
7. Changes sync automatically via PowerSync listeners

**Key files:**
- `src/hooks/useWells.ts` (data fetching & mapping)
- `src/components/MapView.tsx` (map rendering of wells)
- `src/pages/WellListPage.tsx` (list rendering)

**Authentication & Onboarding Flow:**

1. User navigates to app
2. AuthProvider initializes: fetches initial session from Supabase
3. INITIAL_SESSION event triggers onboarding status fetch (RPC call)
4. isAuthReady set to true → RequireAuth unmasks UI
5. User at /auth/phone → PhonePage handles OTP request
6. User at /auth/verify → VerifyPage validates OTP, calls AuthProvider.verifyOtp()
7. verifyOtp sets session directly, fetches onboarding status
8. User redirected by RequireOnboarded guard:
   - If no profile → /onboarding/profile
   - If no farm membership → /onboarding/farm/create
   - If complete → AppLayout wraps route, PowerSyncProvider initializes
9. PowerSyncProvider calls setupPowerSync() → db.connect(connector)

**Key files:**
- `src/lib/AuthProvider.tsx` (auth state, onboarding status RPC)
- `src/pages/auth/PhonePage.tsx` (OTP request)
- `src/pages/auth/VerifyPage.tsx` (OTP verification)
- `src/components/RequireAuth.tsx` (route guard 1)
- `src/components/RequireOnboarded.tsx` (route guard 2)
- `src/components/AppLayout.tsx` (PowerSync initialization, lines 40-46)

**State Management:**

- **PowerSync (data)**: All wells, farms, users, farm_invites stored in local SQLite via PowerSync
- **Auth Context (identity)**: user, session, onboardingStatus, auth methods (sendOtp, verifyOtp, signOut)
- **Local state (UI)**: Component-level useState for modals, form inputs, menu states
- **Planned Zustand stores**: (Not yet implemented) Would store selected well, UI toggles, filters

## Key Abstractions

**PowerSyncDatabase (via @powersync/react):**
- Purpose: Provides offline-first SQLite access with automatic sync
- Examples: `src/lib/powersync.ts`, `src/lib/PowerSyncContext.tsx`
- Pattern: Singleton instance returned by setupPowerSync(), shared via context provider
- Usage: `const db = usePowerSync()` then `db.execute(sql, params)` or `db.getNextCrudTransaction()`

**SupabaseConnector (implements PowerSyncBackendConnector):**
- Purpose: Bridges local CRUD operations to Supabase
- Examples: `src/lib/powersync-connector.ts`
- Pattern: Implements two methods: `fetchCredentials()` (auth token refresh) and `uploadData()` (CRUD sync)
- Responsibility: Maps PowerSync operations (PUT/PATCH/DELETE) to Supabase RPC calls, handles permanent vs retryable errors

**useWells Hook:**
- Purpose: Fetches and transforms well data from PowerSync
- Examples: `src/hooks/useWells.ts`
- Pattern: PowerSync query guarded by farmId, mapped to WellWithReading type, memoized
- Converts send_monthly_report from integer (0/1) to boolean

**Route Guards (Layers):**
- Purpose: Control access based on auth state and onboarding progress
- Examples: `src/components/RequireAuth.tsx`, `src/components/RequireOnboarded.tsx`
- Pattern: Outlet-based guards that show loaders, offline messages, or redirects
- RequireAuth checks session; RequireOnboarded checks profile + farm membership

**AppLayout Wrapper:**
- Purpose: Initializes PowerSync for protected routes, provides Header/SideMenu
- Examples: `src/components/AppLayout.tsx`
- Pattern: Nested layout with PowerSyncProvider wrapping content components
- Ensures PowerSync only initializes after user is authenticated and onboarded

## Entry Points

**main.tsx:**
- Location: `src/main.tsx`
- Triggers: Browser loads app
- Responsibilities: Mounts React app, wraps with BrowserRouter and AuthProvider

**App.tsx:**
- Location: `src/App.tsx`
- Triggers: Router dispatches based on URL
- Responsibilities: Defines all routes, applies guards (RequireAuth, RequireOnboarded), wraps protected routes with AppLayout

**AuthProvider.tsx:**
- Location: `src/lib/AuthProvider.tsx`
- Triggers: App mount
- Responsibilities: Initializes auth state, subscribes to Supabase auth events, fetches onboarding status, provides auth context to app

**AppLayout.tsx:**
- Location: `src/components/AppLayout.tsx`
- Triggers: Protected routes render
- Responsibilities: Initializes PowerSyncProvider (local DB + sync), renders Header/SideMenu/Outlet

**setupPowerSync():**
- Location: `src/lib/powersync.ts`
- Triggers: PowerSyncProvider mounts
- Responsibilities: Creates PowerSyncDatabase instance, initializes SQLite, connects SupabaseConnector, registers status listener

## Error Handling

**Strategy:** Layered error handling with fallbacks

**Patterns:**

**Authentication errors** (AuthProvider):
- OTP send/verify failures caught in try/catch, error state updated in component
- Session fetch failures still allow app to proceed (isAuthReady set to true)
- File: `src/lib/AuthProvider.tsx` lines 206-243

**PowerSync sync errors** (SupabaseConnector):
- Permanent errors (4xx, constraint violations) logged and transaction completed to unblock queue
- Retryable errors (network, 5xx) throw to trigger retry
- File: `src/lib/powersync-connector.ts` lines 13-31, 66-74

**Component-level errors** (DashboardPage):
- Well save errors caught, display toast notification, clear after 5s
- File: `src/pages/DashboardPage.tsx` lines 113-117

**Map tile errors** (MapView):
- Tile load failures detected via error event, offline overlay shown
- File: `src/components/MapView.tsx` line 94+

## Cross-Cutting Concerns

**Logging:** console.log/console.error (development), no centralized logging configured

**Validation:**
- Auth: Phone format checked by Supabase OTP flow
- Form: HTML5 validation on well form inputs
- Database: Supabase RLS policies enforce farm membership

**Authentication:**
- Phone OTP via Supabase Auth
- JWT tokens stored automatically by @supabase/supabase-js
- PowerSync connector refreshes token if expired before sync

**Offline Support:**
- PowerSync handles data queries offline (local SQLite)
- Writes queued automatically by PowerSync CRUD upload
- Map tiles cached via service worker (PWA)
- Geolocation works offline (device hardware)

**Type Safety:**
- TypeScript throughout (`tsconfig.app.json`)
- PowerSync schema generates types: `src/lib/powersync-schema.ts` exports `Farm`, `User`, `Well`, etc.
- Custom hooks provide typed results (e.g., `useWells()` returns `WellWithReading[]`)

---

*Architecture analysis: 2026-02-10*
