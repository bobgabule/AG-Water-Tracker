# External Integrations

**Analysis Date:** 2026-02-10

## APIs & External Services

**Supabase (PostgreSQL + Auth):**
- What it's used for: Primary backend, user authentication, RLS policies, database
- SDK/Client: `@supabase/supabase-js` v2.93.3
- Auth: Uses phone OTP via Supabase Auth (`supabase.auth.signInWithOtp`)
- URL: `VITE_SUPABASE_URL`
- Key: `VITE_SUPABASE_ANON_KEY`
- Authentication: Phone OTP flow in `src/pages/auth/PhonePage.tsx` and `src/pages/auth/VerifyPage.tsx`

**PowerSync:**
- What it's used for: Offline-first data synchronization, local SQLite sync with backend
- SDK/Client: `@powersync/web` v1.32.0, `@powersync/react` v1.8.2
- URL: `VITE_POWERSYNC_URL`
- Implementation: `src/lib/powersync.ts` (setup), `src/lib/powersync-connector.ts` (Supabase bridge)
- Connector: Fetches credentials from Supabase session, uploads CRUD operations back to Supabase

**Mapbox GL JS:**
- What it's used for: Vector tile mapping, satellite/raster tiles, well markers
- SDK/Client: `mapbox-gl` v3.18.1, `react-map-gl` v8.1.0
- Token: `VITE_MAPBOX_TOKEN` (optional; falls back to OpenStreetMap if not provided)
- URLs cached in Workbox:
  - `https://api.mapbox.com/*` (API calls)
  - `https://*.tiles.mapbox.com/*` (vector tiles)
  - `https://*.mapbox.com/fonts/*` (fonts)
  - `https://*.mapbox.com/sprites/*` (sprite assets)
- Implementation: `src/components/MapView.tsx`

## Data Storage

**Databases:**
- **PostgreSQL (Supabase)** - Primary backend database
  - Tables: `farms`, `users`, `farm_members`, `farm_invites`, `wells`
  - Connection: Via `@supabase/supabase-js` client
  - RLS Policies: Defined in `supabase/migrations/002_rls_policies.sql` and others
  - Migrations: 19 migration files in `supabase/migrations/`

- **SQLite (Local/Offline)** - Client-side cache via wa-sqlite
  - Package: `@journeyapps/wa-sqlite` v1.4.1
  - Database file: `ag-water-tracker.db`
  - Location: Browser IndexedDB (via PowerSync)
  - Schema: Defined in `src/lib/powersync-schema.ts` (Farm, User, FarmMember, FarmInvite, Well)

**File Storage:**
- Not detected (local filesystem only, no cloud storage integration)

**Caching:**
- Browser Service Worker cache via Workbox (PWA)
  - Mapbox tiles and assets cached for 7-30 days
  - Implementation: `vite.config.ts` Workbox configuration
- PowerSync provides memory/local caching layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Phone OTP
- Implementation: `src/lib/AuthProvider.tsx`
- Methods:
  - `sendOtp(phone)` - Send OTP to phone number via Supabase Auth
  - `verifyOtp(phone, token)` - Verify OTP and create session
  - `signOut()` - Clear session and disconnect PowerSync
- Auth Context: Provides `user`, `session`, `userProfile`, `onboardingStatus`
- Protected Routes: `src/components/RequireAuth.tsx` guards authenticated routes
- Onboarding Check: `src/components/RequireOnboarded.tsx` ensures profile + farm membership complete

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar service)

**Logs:**
- Browser console logging
- PowerSync status logging in `src/lib/powersync.ts` (debug status changes)
- RPC function logging in `src/lib/AuthProvider.tsx` (onboarding status fetches)

## CI/CD & Deployment

**Hosting:**
- Not detected (no GitHub Actions, CircleCI, or Vercel configuration found)

**CI Pipeline:**
- Not detected (development/build only via local npm scripts)

## Environment Configuration

**Required env vars:**
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_POWERSYNC_URL=https://xxxxx.powersync.com
VITE_MAPBOX_TOKEN=(optional)
VITE_GPS_RANGE_METERS=100 (default)
```

**Secrets location:**
- `.env` file (local development only, NOT committed)
- `.env.example` provided with dummy values for documentation

## Webhooks & Callbacks

**Incoming:**
- PowerSync callbacks: Status listener in `src/lib/powersync.ts` (`db.registerListener`)
  - `statusChanged(status)` - Fires when sync status changes (connected, lastSyncedAt, dataFlowStatus)
- Supabase Auth callbacks: Handled in `src/lib/AuthProvider.tsx`
  - `supabase.auth.onAuthStateChange()` - Listens for sign-in/sign-out events

**Outgoing:**
- PowerSync -> Supabase uploads: Via `SupabaseConnector.uploadData()` in `src/lib/powersync-connector.ts`
  - Operations: INSERT, UPDATE, DELETE on tables: `farms`, `users`, `farm_members`, `farm_invites`, `wells`
  - Error handling: Distinguishes permanent (constraint, RLS) vs retryable (network) errors
- Supabase RPC calls: `get_onboarding_status()` RPC invoked in `src/lib/AuthProvider.tsx`

## Data Sync Flow

**PowerSync Sync Cycle:**
1. Client-side operations (INSERT/UPDATE/DELETE) queued in local SQLite
2. PowerSync connector fetches Supabase credentials (JWT token)
3. CRUD operations uploaded to Supabase via `uploadData()` callback
4. PowerSync subscription buckets download data from Supabase:
   - `user_farms` - Farms user has membership in
   - `farm_members` - Members of user's farms
   - `farm_invites_owner` / `farm_invites_admin` - Invite codes (role-based)
   - `farm_wells` - Wells for user's farms
   - `user_profile` - User's own profile
5. Downloaded data synced to local SQLite
6. React components subscribe via `useQuery<T>(sql, params)` from `@powersync/react`

**Sync Rules Documentation:**
- File: `docs/powersync-sync-rules.yaml` (dashboard configuration reference)
- Rules configured in PowerSync dashboard (NOT in codebase)
- Uses `request.user_id()` JWT claim for permission checks

## Integration Patterns

**Offline-First Architecture:**
- All queries run against local SQLite first
- PowerSync syncs in background when connection available
- UI reflects local state immediately, no waiting for server

**Type Safety:**
- PowerSync schema types auto-generated in `src/lib/powersync-schema.ts`
- `Database`, `Farm`, `User`, `FarmMember`, `FarmInvite`, `Well` exported for TypeScript
- Supabase types via `@supabase/supabase-js` (generic JSON-based, not auto-generated)

**Authentication Flow:**
- Phone OTP via Supabase Auth (no external SMS provider integrated directly)
- JWT tokens in Supabase session used for PowerSync credentials
- Role-based access: `owner`, `admin`, `member` (farm_members.role column)

---

*Integration audit: 2026-02-10*
