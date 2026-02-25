# Implementation Plan - AG Water Tracker

## Goal
Build a mobile-first Progressive Web App (PWA) for tracking water well usage with offline capabilities, GPS verification, and multi-farm support.

## Setup Prerequisites Checklist

Before starting development, complete these setup steps:

### 1. Supabase Account & Project
- [ ] Sign up at [supabase.com](https://supabase.com)
- [ ] Create new project (takes ~2 minutes to provision)
- [ ] Copy **Project URL** → Save for `.env` as `VITE_SUPABASE_URL`
- [ ] Copy **Anon/Public Key** → Save for `.env` as `VITE_SUPABASE_ANON_KEY`
- [ ] Navigate to SQL Editor → Run migration scripts (provided in [API.md](API.md))
- **Estimated Time**: 10 minutes

### 2. Mapbox Access Token
- [ ] Sign up at [mapbox.com](https://mapbox.com/signup)
- [ ] Navigate to Account → Access Tokens
- [ ] Create new token with `styles:read` and `fonts:read` scopes
- [ ] Copy token → Save for `.env` as `VITE_MAPBOX_TOKEN`
- **Alternative**: Use Leaflet with OpenStreetMap (free, no API key required - instructions in [SETUP.md](SETUP.md))
- **Estimated Time**: 5 minutes

### 3. PowerSync Service
- [ ] Sign up at [powersync.com](https://www.powersync.com/)
- [ ] Create new PowerSync instance
- [ ] Connect to Supabase (requires Supabase Project URL and Service Role Key)
- [ ] Configure sync rules (provided in [API.md](API.md))
- [ ] Copy PowerSync endpoint → Save for `.env` as `VITE_POWERSYNC_URL`
- **Estimated Time**: 15 minutes

### 4. Development Environment
- [ ] Node.js v20+ installed (`node --version`) — v22 LTS recommended
- [ ] npm or pnpm package manager
- [ ] Git for version control
- [ ] Code editor (VS Code recommended)

**Total Setup Time**: ~30-40 minutes

Once complete, proceed to [SETUP.md](SETUP.md) for development environment setup.

## Proposed Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript (Vite 6)
- **Styling**: Tailwind CSS v4 + generic UI components (Headless UI / Radix UI) - *Custom styling per prompt requirements (Dark Olive Green theme)*
- **State Management**: Zustand v5
- **Offline/Sync**: PowerSync (SQLite in browser)
- **Maps**: Mapbox GL JS (via `react-map-gl`)
- **Routing**: React Router v7
- **PWA**: `vite-plugin-pwa`

### Database Schema (Supabase PostgreSQL)
Tables to be created (I will provide `.sql` files):
1.  `farms`
2.  `users` (extends auth.users)
3.  `wells` (PostGIS geometry for location)
4.  `allocations`
5.  `readings`

### Offline & Sync Strategy

**Read Operations:**
- All data reads go through PowerSync's local SQLite database
- Provides instant access even when offline
- Automatically updates when backend data changes

**Write Operations (Offline-First Approach):**
Given the requirement for complete offline functionality (e.g., "Add new meter reading with GPS works completely offline"), we leverage PowerSync's built-in CRUD upload queue:

1. **PowerSync Backend Connector** (`src/lib/powersync-connector.ts`):
   - Implements `uploadData()` method in the `PowerSyncBackendConnector`
   - All local writes are automatically queued by PowerSync in its internal upload queue
   - When **online**: PowerSync calls `uploadData()` which sends mutations to Supabase via the REST API
   - When **offline**: Writes are persisted locally in SQLite and queued for upload on reconnection
   - Provides optimistic UI updates (local SQLite changes are immediately visible)

2. **Upload Mechanism**:
   - Uses `getNextCrudTransaction()` or `getCrudBatch()` to retrieve pending writes
   - Sends each batch to Supabase via PostgREST API
   - Calls `CrudTransaction.complete()` after successful upload
   - Handles errors: 5xx errors trigger retry, validation errors should return 2xx to avoid blocking the queue
   - PowerSync automatically retries on reconnection with configurable debouncing

3. **Queue Operations**:
   - Create well → Written to local SQLite, queued for upload
   - Add reading → Written locally with timestamp and GPS data, queued for upload
   - Update allocation → Written locally, queued for upload
   - PowerSync automatically syncs backend changes down to local DB

This approach ensures the app works completely offline while maintaining data consistency when online, without requiring a custom IndexedDB queue.

## Core Features Breakdown

### 1. Project Setup
- Vite + React + TS
- Tailwind config with custom colors (Dark Olive Green #4A5D23 etc.)
- PWA manifest configuration.

### 2. Data Layer
- `PowerSyncContext`: Provider for the database connection.
- `useSupabase`: Hook for Auth and API.
- `Schema`: Define `powersync-schema.ts` matching the Postgres schema.

### Authentication Flow
- **Method**: Passwordless phone OTP via Supabase Auth
- **Provider**: `AuthProvider` (`src/lib/AuthProvider.tsx`) with `isAuthReady` gate
- **Route Structure**:
  ```
  /auth/phone              → Phone input page
  /auth/verify             → OTP verification page
  /onboarding/profile      → Profile creation (name, email)
  /onboarding/farm         → Farm choice (create vs join)
  /onboarding/farm/create  → Create new farm form
  /onboarding/farm/join    → Join with invite code form
  /app/*                   → Protected app routes
  ```
- **Guards**:
  - `RequireAuth` - Checks session, shows offline message if needed
  - `RequireOnboarded` - Checks profile + farm membership complete
- **Route Resolver**: `resolveNextRoute(onboardingStatus)` determines next step
- **PowerSync Lifecycle**: Connect on login, disconnect + clear local DB on logout
- **Phone format**: US numbers only (+1 prefix hardcoded)

### New Data Model (Auth/Membership)

**farm_members** (replaces users.farm_id):
```sql
farm_id UUID REFERENCES farms(id)
user_id UUID REFERENCES auth.users(id)
role TEXT ('owner' | 'admin' | 'member')
created_at TIMESTAMPTZ
```

**farm_invites** (invite code management):
```sql
code TEXT PRIMARY KEY (6-char alphanumeric)
farm_id UUID REFERENCES farms(id)
role TEXT ('admin' | 'member')
expires_at TIMESTAMPTZ
max_uses INTEGER (nullable = unlimited)
uses_count INTEGER
created_by UUID
```

**Atomic RPCs**:
- `create_farm_and_membership(farm_name, whim_number)` → UUID
- `get_onboarding_status()` → JSON

### 3. Components
- `Layout`: Header with Farm Name, Offline Indicator.
- `MapView`: Central component with geolocation features.
- `WellForm`: Reusable form for Add/Edit.
- `AllocationGauge`: Custom SVG/Canvas component for the "gas gauge" visual.

## Dashboard Map Features

### Geolocation & Auto-Centering

The dashboard map (`MapView` component) automatically centers on the user's current location when loaded.

**Implementation Details:**

1. **Geolocation Request on Mount** (`src/components/MapView.tsx`)
   - Geolocation is requested BEFORE the map renders (not after)
   - Uses `navigator.geolocation.getCurrentPosition()` directly
   - Timeout: 5 seconds for fast feedback
   - Options: `{ enableHighAccuracy: true, timeout: 5000 }`

2. **Loading State**
   - Shows a loading spinner with "Getting your location..." message
   - Dark background (`bg-gray-900`) to match map aesthetic
   - Prevents the "USA flash" (map briefly showing default view before centering)

3. **Initial View State Priority**
   ```
   1. User's current location (zoom 18 - street level)
   2. Wells center (if user has wells with locations)
   3. USA center fallback (lat: 38.5, lng: -98.5, zoom: 4)
   ```

4. **Key Files:**
   - `src/components/MapView.tsx` - Main map component
   - `src/hooks/useGeolocationPermission.ts` - Permission state tracking hook
   - `src/components/LocationPermissionBanner.tsx` - Permission denied UI

### Geolocation Permission Handling

**Permission States:**

| State | Behavior |
|-------|----------|
| `prompt` | Browser shows permission dialog during loading |
| `granted` | Map loads at user's location (zoom 18) |
| `denied` | Map loads at wells/default view, banner appears |

**Permission Banner (`LocationPermissionBanner.tsx`):**
- Shown when geolocation permission is denied
- Amber/warning styling with dismiss button
- Explains why location is needed
- Dismissible (stored in `sessionStorage` for session persistence)
- Key: `location-banner-dismissed`

**Permission Hook (`useGeolocationPermission.ts`):**
```typescript
// Returns: 'prompt' | 'granted' | 'denied'
const permission = useGeolocationPermission();
```
- Uses the browser Permissions API
- Listens for permission changes in real-time
- Falls back to 'prompt' if Permissions API unavailable
- Handles cleanup to prevent memory leaks

### Map Configuration

**Zoom Levels:**
- `USER_LOCATION_ZOOM = 18` - Street-level detail for user location
- Wells view: 14-15 (single well), 6-15 (multiple wells based on spread)
- Default USA view: zoom 4

**Map Style:** `mapbox://styles/mapbox/satellite-streets-v12`

**Controls:**
- `NavigationControl` - Zoom in/out buttons (top-right, marginTop: 80)
- `GeolocateControl` - Re-center on location button (top-right, marginTop: 120)
  - Shows blue dot at user location
  - Shows accuracy circle
  - Manual re-centering available anytime

### Location Picker Mode

The map supports a location picker mode for selecting well locations:

**Props:**
```typescript
interface MapViewProps {
  wells: WellWithReading[];
  onWellClick?: (wellId: string) => void;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  pickedLocation?: { latitude: number; longitude: number } | null;
  isPickingLocation?: boolean;
}
```

**Behavior:**
- When `isPickingLocation` is true, map clicks call `onMapClick` with coordinates
- `LocationPickerMarker` component shows the picked location
- Used by well creation/editing flow

## Design System Implementation
### Color Palette (from Screenshot)
- **Primary (Header/Nav)**: `#4A5D23` (Dark Olive Green)
- **Secondary (Cards/Forms)**: `#8B9A6B` (Sage Green) with transparency/blur (`backdrop-filter`).
- **Accent (Actions)**: `#3B82F6` (Blue) for "New Reading", GPS.
- **Status**: `#22C55E` (Green/Alive), `#EF4444` (Red/Dead), `#EAB308` (Yellow/Warning).
- **Background**: Map-dominant interface.

### Typography
- **Headings**: Sans-serif (Inter/Roboto), White, Bold.
- **Body**: White (on green cards), dark gray (on light inputs).

### Responsive Layout Strategy
- **Mobile (< 768px)**:
  - **Well List**: Bottom drawer or separate view.
  - **Well Detail**: Full-screen overlay or bottom sheet sliding up.
  - **Forms**: Full-screen modal or large bottom sheet.
- **Tablet (768px - 1024px) & Desktop (> 1024px)**:
  - **Layout**: "Mailbox" style or Floating Panels.
  - **Map**: Always visible in background.
  - **Well List**: Persistent sidebar (left) or floating panel (top-left).
  - **Well Detail**: Floating panel (right) or modal overlay centered.
  - **Forms**: Centered Modal dialogs.

## Implementation Readiness Checklist

Before beginning implementation, verify:

- [ ] **All API keys obtained** and documented in `.env.example`
- [ ] **Database schema finalized** (see [API.md](API.md))
- [ ] **Component hierarchy** mapped out (see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] **Routing structure** defined (see [ARCHITECTURE.md](ARCHITECTURE.md))
- [ ] **State management approach** confirmed (Zustand for UI state, PowerSync for data)
- [ ] **Offline strategy** understood (see Offline & Sync Strategy section above)
- [ ] **Design system** colors documented (Primary: #4A5D23, Secondary: #8B9A6B, Accent: #3B82F6)

**Next Steps**: Follow the granular task list in [task.md](task.md) to build the application step-by-step.

## Verification Plan

### Automated Tests
- **Linting/Type Check**: `npm run lint`, `npm run type-check`
- **Unit Tests**: `vitest` for utility functions (unit conversions, GPS calculations, allocation logic)
- **Component Tests**: React Testing Library for form validation and UI components
- **Target Coverage**: >80% for utility functions, >60% overall

### Manual Verification

**Offline Functionality Test**:
1. Load app in Chrome/Edge
2. Open DevTools → Network tab → Set to "Offline"
3. Add new well (verify form works, data queued)
4. Add new reading (verify GPS capture works offline)
5. Check offline indicator (should show red/offline status)
6. Set network back to "Online"
7. Verify sync indicator shows "Syncing..."
8. Verify data appears in Supabase dashboard
9. Verify no data loss

**GPS Verification Test**:
1. Open DevTools → More Tools → Sensors
2. Set custom location near a well (within 100m)
3. Capture GPS on reading form
4. Verify "In Range" badge appears (green)
5. Set location far from well (>100m)
6. Capture GPS again
7. Verify "Out of Range" warning appears (yellow/red)

**Dashboard Map Geolocation Test**:
1. Clear browser site data (to reset permission)
2. Open dashboard - should see "Getting your location..." spinner
3. Grant permission - map should load directly at your location (zoom 18)
4. Verify no "USA flash" (map shouldn't briefly show USA before centering)
5. Clear site data again and reload
6. Deny permission - should see amber permission banner
7. Dismiss banner - should not reappear during session
8. Verify GeolocateControl button (top-right) works for manual re-centering
9. Test with DevTools Sensors to simulate different locations

**PWA Installation Test**:
1. Build production bundle: `npm run build`
2. Serve locally: `npx serve dist`
3. Open in Chrome → DevTools → Application → Manifest
4. Verify manifest loads correctly
5. Check for install prompt in address bar
6. Click install, verify app opens in standalone window
7. Go offline, verify app still works

**Mobile Device Test**:
1. Deploy to test URL (Vercel/Netlify)
2. Open on Android/iOS device
3. Add to home screen
4. Test offline mode with airplane mode
5. Test GPS capture with real location
6. Verify responsive layout on small screen

See [task.md](task.md) for detailed task-level verification steps.

