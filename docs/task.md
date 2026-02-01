# Task List: AG Water Tracker PWA

## Quick Start
**Current Phase**: Phase 1 - Project Setup
**Progress**: 0/62 tasks completed (0%)
**Next 3 Tasks**:
1. Initialize Vite Project (id: 1)
2. Install and Configure Tailwind CSS (id: 2)
3. Configure Vite PWA Plugin (id: 3)

---

## Phase 1: Project Initialization & Architecture

### 1.1 Initialize Vite Project
- [ ] **Initialize Vite Project** (Size: S) <!-- id: 1 -->
  - **What**: Create new Vite 6 + React 19 + TypeScript project
  - **Command**: `npm create vite@latest . -- --template react-ts`
  - **Files**: Creates `package.json`, `vite.config.ts`, `tsconfig.json`, `src/`
  - **Acceptance Criteria**:
    - [ ] `npm run dev` starts development server
    - [ ] TypeScript compilation has no errors
    - [ ] Browser shows default Vite + React page at http://localhost:5173
  - **Dependencies**: None
  - **Verification**: Run `npm run dev`, open http://localhost:5173, see Vite + React default page

### 1.2 Configure Styling
- [ ] **Install and Configure Tailwind CSS v4** (Size: S) <!-- id: 2 -->
  - **What**: Install Tailwind CSS v4 with Vite plugin and configure custom theme colors
  - **Command**: `npm install tailwindcss @tailwindcss/vite`
  - **Files**:
    - Modify `vite.config.ts` (add `@tailwindcss/vite` plugin)
    - Modify `src/index.css`
  - **Acceptance Criteria**:
    - [ ] `@import "tailwindcss"` in `index.css`
    - [ ] Custom colors configured via `@theme` in CSS: `--color-primary: #4A5D23`, `--color-secondary: #8B9A6B`, `--color-accent: #3B82F6`
    - [ ] Can use Tailwind classes in components
    - [ ] No `tailwind.config.js` or `postcss.config.js` needed (Tailwind v4 uses CSS-first config)
  - **Dependencies**: Task 1
  - **Verification**: Add `<div className="bg-primary text-white p-4">Test</div>` to App.tsx and verify dark olive green background

- [ ] **Install UI Component Libraries** (Size: S) <!-- id: 3 -->
  - **What**: Install Headless UI and Heroicons for accessible components
  - **Command**: `npm install @headlessui/react @heroicons/react`
  - **Files**: Updates `package.json`
  - **Acceptance Criteria**:
    - [ ] @headlessui/react installed
    - [ ] @heroicons/react installed (both solid and outline)
    - [ ] No dependency conflicts
  - **Dependencies**: Task 1
  - **Verification**: Import `{ Menu } from '@headlessui/react'` and verify no errors

### 1.3 Configure PWA
- [ ] **Configure Vite PWA Plugin** (Size: M) <!-- id: 4 -->
  - **What**: Install and configure vite-plugin-pwa for PWA capabilities
  - **Command**: `npm install -D vite-plugin-pwa`
  - **Files**:
    - Modify `vite.config.ts`
    - Create `public/manifest.json`
    - Add PWA icons to `public/icons/`
  - **Acceptance Criteria**:
    - [ ] Plugin configured in `vite.config.ts` with `registerType: 'autoUpdate'`
    - [ ] Manifest includes app name "AG Water Tracker", theme color #4A5D23
    - [ ] 192x192 and 512x512 icons present
    - [ ] Service worker registered in production build
  - **Dependencies**: Task 1
  - **Verification**: Build app (`npm run build`), serve locally, verify install prompt in DevTools Application tab

### 1.4 Project Structure
- [ ] **Create Folder Structure** (Size: S) <!-- id: 5 -->
  - **What**: Set up organized folder structure for the project
  - **Files**: Create directories:
    - `src/components/` - React components
    - `src/hooks/` - Custom React hooks
    - `src/lib/` - Utilities and services
    - `src/types/` - TypeScript type definitions
    - `src/stores/` - Zustand state stores
    - `src/pages/` - Page components
  - **Acceptance Criteria**:
    - [ ] All folders exist with `.gitkeep` files
    - [ ] Folder structure matches architecture plan
  - **Dependencies**: Task 1
  - **Verification**: Run `ls -R src/` and verify folder structure

---

## Phase 2: Backend Integration (Supabase & PowerSync)

### 2.1 Supabase Setup
- [ ] **Create Supabase SQL Schema** (Size: M) <!-- id: 6 -->
  - **What**: Write complete SQL migration for all tables
  - **Files**: Create `supabase/migrations/001_initial_schema.sql`
  - **Acceptance Criteria**:
    - [ ] Tables defined: `organizations`, `users`, `wells`, `allocations`, `readings`
    - [ ] PostGIS extension enabled for `wells.location` geometry column
    - [ ] Foreign key constraints defined
    - [ ] Indexes on commonly queried columns
    - [ ] Triggers for `updated_at` timestamps
  - **Dependencies**: None (can run in parallel with frontend)
  - **Verification**: Copy-paste SQL into Supabase SQL Editor, execute, verify tables created

- [ ] **Define Supabase RLS Policies** (Size: M) <!-- id: 7 -->
  - **What**: Write Row Level Security policies for each table
  - **Files**: Create `supabase/migrations/002_rls_policies.sql`
  - **Acceptance Criteria**:
    - [ ] Users can only see data from their organization
    - [ ] Only org admins can create/delete wells
    - [ ] All users in org can add readings
    - [ ] Policies tested for edge cases
  - **Dependencies**: Task 6
  - **Verification**: Test queries as different users, verify correct data access

- [ ] **Install Supabase Client** (Size: S) <!-- id: 8 -->
  - **What**: Install Supabase JS client library
  - **Command**: `npm install @supabase/supabase-js`
  - **Files**:
    - Updates `package.json`
    - Create `src/lib/supabase.ts` with client initialization
    - Create `.env.example` with placeholders
  - **Acceptance Criteria**:
    - [ ] @supabase/supabase-js installed
    - [ ] Supabase client created in `src/lib/supabase.ts`
    - [ ] Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured
  - **Dependencies**: Task 1
  - **Verification**: Import client, verify no errors, test connection with dummy query

### 2.2 PowerSync Setup
- [ ] **Install PowerSync SDK** (Size: S) <!-- id: 9 -->
  - **What**: Install PowerSync React SDK
  - **Command**: `npm install @powersync/react @powersync/web`
  - **Files**: Updates `package.json`
  - **Acceptance Criteria**:
    - [ ] PowerSync packages installed
    - [ ] No dependency conflicts
  - **Dependencies**: Task 1
  - **Verification**: Import PowerSync components, verify no errors

- [ ] **Define PowerSync Schema** (Size: M) <!-- id: 10 -->
  - **What**: Create PowerSync schema matching Supabase tables
  - **Files**: Create `src/lib/powersync-schema.ts`
  - **Acceptance Criteria**:
    - [ ] Schema includes all tables: organizations, users, wells, allocations, readings
    - [ ] Column types match Supabase schema
    - [ ] Indexes defined for queries
  - **Dependencies**: Task 6, Task 9
  - **Verification**: Schema compiles without TypeScript errors

- [ ] **Configure PowerSync Connector** (Size: L) <!-- id: 11 -->
  - **What**: Set up PowerSync backend connector to Supabase
  - **Files**:
    - Create `src/lib/powersync-connector.ts`
    - Modify `src/lib/powersync.ts` with database initialization
  - **Acceptance Criteria**:
    - [ ] Connector implements upload/download queue
    - [ ] Credentials configured from environment variables
    - [ ] Database initialized on app load
    - [ ] Sync status observable
  - **Dependencies**: Task 8, Task 10
  - **Verification**: Run app, check console for successful PowerSync connection, verify local SQLite DB created

- [ ] **Create PowerSync Context Provider** (Size: M) <!-- id: 12 -->
  - **What**: Create React context for PowerSync database
  - **Files**: Create `src/lib/PowerSyncContext.tsx`
  - **Acceptance Criteria**:
    - [ ] Context provides PowerSync database instance
    - [ ] Hook `usePowerSync()` available
    - [ ] Provider wraps App component
    - [ ] Loading state handled
  - **Dependencies**: Task 11
  - **Verification**: Use hook in component, access database, run query

---

## Phase 3: Authentication & Farm Setup

### 3.1 Authentication Pages
- [ ] **Create Login Page** (Size: M) <!-- id: 13 -->
  - **What**: Build login page with email/password form
  - **Files**: Create `src/pages/LoginPage.tsx`
  - **Acceptance Criteria**:
    - [ ] Email and password inputs with validation
    - [ ] Submit button calls Supabase auth
    - [ ] Loading state during authentication
    - [ ] Error messages displayed
    - [ ] Link to registration page
  - **Dependencies**: Task 8
  - **Verification**: Enter credentials, verify auth request sent, check for proper error handling

- [ ] **Create Registration Page** (Size: M) <!-- id: 14 -->
  - **What**: Build registration page with email/password form
  - **Files**: Create `src/pages/RegisterPage.tsx`
  - **Acceptance Criteria**:
    - [ ] Email, password, and confirm password inputs
    - [ ] Password strength indicator
    - [ ] Email validation
    - [ ] Creates user in Supabase Auth
    - [ ] Redirects to organization setup after registration
  - **Dependencies**: Task 8
  - **Verification**: Register new user, verify user created in Supabase Auth

- [ ] **Create Auth Context** (Size: M) <!-- id: 15 -->
  - **What**: Create React context for authentication state
  - **Files**: Create `src/lib/AuthContext.tsx`
  - **Acceptance Criteria**:
    - [ ] Context provides current user, loading state, sign in/out methods
    - [ ] Hook `useAuth()` available
    - [ ] Persists session across page reloads
    - [ ] Handles auth state changes
  - **Dependencies**: Task 8
  - **Verification**: Sign in, refresh page, verify still authenticated

### 3.2 Farm Management
- [ ] **Create Farm Setup Page** (Size: M) <!-- id: 16 -->
  - **What**: Build page for registering or joining a farm
  - **Files**: Create `src/pages/FarmSetupPage.tsx`
  - **Acceptance Criteria**:
    - [ ] Tab for Register a Farm and Join a Farm
    - [ ] Create form: farm name, description
    - [ ] Join form: invite code input
    - [ ] Creates farm record in Supabase
    - [ ] Associates user with farm
  - **Dependencies**: Task 6, Task 15
  - **Verification**: Create farm, verify record in database, verify user association

- [ ] **Implement Protected Routes** (Size: M) <!-- id: 17 -->
  - **What**: Set up React Router with protected routes
  - **Command**: `npm install react-router`
  - **Files**:
    - Create `src/App.tsx` router configuration
    - Create `src/components/ProtectedRoute.tsx`
  - **Acceptance Criteria**:
    - [ ] Unauthenticated users redirected to /login
    - [ ] Users without farm redirected to /setup
    - [ ] Authenticated users with org can access /dashboard
  - **Dependencies**: Task 15
  - **Verification**: Test navigation as unauthenticated, authenticated without farm, and authenticated with farm

---

## Phase 4: Core Features (Well Management)

### 4.1 Layout Components
- [ ] **Create Base Layout Component** (Size: M) <!-- id: 18 -->
  - **What**: Build main application layout shell
  - **Files**: Create `src/components/Layout.tsx`
  - **Acceptance Criteria**:
    - [ ] Header with farm name
    - [ ] Offline status indicator in header
    - [ ] Responsive sidebar (desktop) / drawer (mobile)
    - [ ] Main content area
    - [ ] Uses Tailwind custom theme colors
  - **Dependencies**: Task 2, Task 15
  - **Verification**: View on mobile and desktop, verify responsive behavior

- [ ] **Create Header Component** (Size: S) <!-- id: 19 -->
  - **What**: Build application header with navigation
  - **Files**: Create `src/components/Header.tsx`
  - **Acceptance Criteria**:
    - [ ] Displays farm name from context
    - [ ] User menu with sign out option
    - [ ] Offline indicator (red dot when offline)
    - [ ] Mobile menu toggle button
  - **Dependencies**: Task 15
  - **Verification**: Toggle online/offline in DevTools, verify indicator changes

- [ ] **Create Offline Indicator Component** (Size: S) <!-- id: 20 -->
  - **What**: Build component showing online/offline status
  - **Files**: Create `src/components/OfflineIndicator.tsx`
  - **Acceptance Criteria**:
    - [ ] Uses `navigator.onLine` and online/offline events
    - [ ] Shows green indicator when online
    - [ ] Shows red indicator when offline with message
    - [ ] Syncing state indicator (animated)
  - **Dependencies**: None
  - **Verification**: Toggle network in DevTools, verify indicator updates in real-time

### 4.2 Map Integration
- [ ] **Install Map Libraries** (Size: S) <!-- id: 21 -->
  - **What**: Install Mapbox GL JS and React wrapper
  - **Command**: `npm install mapbox-gl react-map-gl`
  - **Files**: Updates `package.json`
  - **Acceptance Criteria**:
    - [ ] mapbox-gl and react-map-gl installed
    - [ ] Types installed for TypeScript
  - **Dependencies**: Task 1
  - **Verification**: Import libraries, verify no errors

- [ ] **Create Map Component** (Size: L) <!-- id: 22 -->
  - **What**: Build map view component showing wells
  - **Files**: Create `src/components/MapView.tsx`
  - **Acceptance Criteria**:
    - [ ] Map loads with Mapbox API key from env
    - [ ] Centers on user's location or default coordinates
    - [ ] Shows markers for all wells in organization
    - [ ] Clicking marker shows well summary popup
    - [ ] Responsive and fills available space
  - **Dependencies**: Task 21, Task 12
  - **Verification**: Add Mapbox token, run app, verify map loads and displays wells

- [ ] **Add Well Markers to Map** (Size: M) <!-- id: 23 -->
  - **What**: Create custom markers for wells with status indicators
  - **Files**: Create `src/components/WellMarker.tsx`
  - **Acceptance Criteria**:
    - [ ] Markers show well status (Alive/Dead) with color coding
    - [ ] Marker size indicates importance or usage
    - [ ] Clicking marker selects well
    - [ ] Selected marker has distinct appearance
  - **Dependencies**: Task 22
  - **Verification**: Click different wells, verify selection state

### 4.3 Well List View
- [ ] **Create Well List Component** (Size: M) <!-- id: 24 -->
  - **What**: Build list view of all wells in organization
  - **Files**: Create `src/components/WellList.tsx`
  - **Acceptance Criteria**:
    - [ ] Lists all wells from PowerSync
    - [ ] Shows well name, status, current usage vs allocation
    - [ ] Search/filter functionality
    - [ ] Clicking well navigates to detail view
    - [ ] Loading skeleton while data fetches
  - **Dependencies**: Task 12
  - **Verification**: Verify list displays, search works, click navigates

- [ ] **Add Well List Filters** (Size: S) <!-- id: 25 -->
  - **What**: Add filtering options to well list
  - **Files**: Modify `src/components/WellList.tsx`
  - **Acceptance Criteria**:
    - [ ] Filter by status (All/Alive/Dead)
    - [ ] Filter by allocation status (Under/Over)
    - [ ] Sort by name, usage, allocation
    - [ ] Filters persist in URL query params
  - **Dependencies**: Task 24
  - **Verification**: Apply filters, verify correct wells shown, refresh page, verify filters persist

### 4.4 Add New Well
- [ ] **Create Well Form Component** (Size: L) <!-- id: 26 -->
  - **What**: Build form for creating/editing wells
  - **Files**: Create `src/components/WellForm.tsx`
  - **Acceptance Criteria**:
    - [ ] Fields: well name, meter ID, location (lat/lon), allocation (acre-feet)
    - [ ] GPS capture button to auto-fill location
    - [ ] Field validation (required fields, number formats)
    - [ ] Submit saves to Supabase
    - [ ] Error handling and display
    - [ ] Works offline (queues mutation)
  - **Dependencies**: Task 8, Task 12
  - **Verification**: Fill form, submit, verify well created in database

- [ ] **Implement GPS Location Capture** (Size: M) <!-- id: 27 -->
  - **What**: Add GPS location capture functionality
  - **Files**: Create `src/hooks/useGeolocation.ts`
  - **Acceptance Criteria**:
    - [ ] Hook returns current location from browser Geolocation API
    - [ ] Handles permission requests
    - [ ] Shows loading state while acquiring location
    - [ ] Error handling for denied permissions or unavailable GPS
    - [ ] Auto-fills form fields when location captured
  - **Dependencies**: None
  - **Verification**: Click GPS button, grant permission, verify lat/lon populated

- [ ] **Create Add Well Page** (Size: M) <!-- id: 28 -->
  - **What**: Create page/modal for adding new well
  - **Files**: Create `src/pages/AddWellPage.tsx` or modal component
  - **Acceptance Criteria**:
    - [ ] Contains WellForm component
    - [ ] "Save" button submits form
    - [ ] "Cancel" button returns to previous view
    - [ ] Success message on save
    - [ ] Redirects to well detail after creation
  - **Dependencies**: Task 26
  - **Verification**: Navigate to add well, fill form, save, verify navigation and data

### 4.5 Well Detail View
- [ ] **Create Well Detail Component** (Size: L) <!-- id: 29 -->
  - **What**: Build detailed view of a single well
  - **Files**: Create `src/components/WellDetail.tsx`
  - **Acceptance Criteria**:
    - [ ] Displays well name, status, meter ID, location
    - [ ] Shows allocation gauge (visual progress indicator)
    - [ ] Lists recent readings
    - [ ] Button to add new reading
    - [ ] Button to edit well
    - [ ] Map snippet showing well location
  - **Dependencies**: Task 12
  - **Verification**: Navigate to well detail, verify all data displays correctly

- [ ] **Create Allocation Gauge Component** (Size: M) <!-- id: 30 -->
  - **What**: Build custom "gas gauge" style allocation visual
  - **Files**: Create `src/components/AllocationGauge.tsx`
  - **Acceptance Criteria**:
    - [ ] SVG-based gauge showing usage vs allocation
    - [ ] Color changes based on percentage (green → yellow → red)
    - [ ] Displays numeric values (used / total)
    - [ ] Animated transition when values change
    - [ ] Responsive sizing
  - **Dependencies**: None
  - **Verification**: Pass different usage values, verify gauge updates and colors change

- [ ] **Add Recent Readings List** (Size: M) <!-- id: 31 -->
  - **What**: Display list of recent readings for a well
  - **Files**: Create `src/components/ReadingsList.tsx`
  - **Acceptance Criteria**:
    - [ ] Lists readings sorted by date (newest first)
    - [ ] Shows date, meter value, calculated usage, GPS status
    - [ ] Pagination or "load more" for long lists
    - [ ] Empty state when no readings
  - **Dependencies**: Task 12
  - **Verification**: View well with readings, verify list displays correctly

---

## Phase 5: Offline & Sync Capabilities

### 5.1 PowerSync Upload Connector
- [ ] **Implement PowerSync uploadData Connector** (Size: L) <!-- id: 32 -->
  - **What**: Implement the `uploadData()` method in the PowerSync backend connector to send local writes to Supabase
  - **Files**: Modify `src/lib/powersync-connector.ts`
  - **Acceptance Criteria**:
    - [ ] `uploadData()` uses `getNextCrudTransaction()` to retrieve pending writes
    - [ ] Each CRUD operation (PUT/PATCH/DELETE) is sent to Supabase via PostgREST API
    - [ ] Calls `CrudTransaction.complete()` after successful upload
    - [ ] Handles 5xx errors with retry (throw error) vs validation errors (complete transaction to avoid blocking queue)
    - [ ] Provides queue status (pending count) via PowerSync status API
  - **Dependencies**: Task 11
  - **Verification**: Go offline, create reading, go online, verify sync occurs via PowerSync

- [ ] **Test Offline Write & Sync Flow** (Size: M) <!-- id: 33 -->
  - **What**: Verify all write operations work offline and sync correctly when back online
  - **Files**: No new files — integration testing of PowerSync connector
  - **Acceptance Criteria**:
    - [ ] Local writes via PowerSync SQL are immediately visible in UI
    - [ ] Writes sync to Supabase when online
    - [ ] Multiple offline writes sync in correct order
    - [ ] Sync status indicator reflects pending/completed state
  - **Dependencies**: Task 32
  - **Verification**: Test create/update/delete while offline, verify queue and sync

### 5.2 Background Sync
- [ ] **Configure PowerSync Reconnection & Background Sync** (Size: M) <!-- id: 34 -->
  - **What**: Configure PowerSync's automatic reconnection and service worker integration for background sync
  - **Files**: Modify `src/lib/powersync.ts` and service worker config in `vite.config.ts`
  - **Acceptance Criteria**:
    - [ ] PowerSync automatically reconnects and triggers `uploadData()` when connectivity is restored
    - [ ] Service worker caches app shell for offline access
    - [ ] Sync resumes when app is reopened after being offline
  - **Dependencies**: Task 4, Task 32
  - **Verification**: Queue mutations offline, close app, come online, verify sync happens on reopen

- [ ] **Add Sync Status UI** (Size: S) <!-- id: 35 -->
  - **What**: Display sync status to user
  - **Files**: Modify `src/components/OfflineIndicator.tsx`
  - **Acceptance Criteria**:
    - [ ] Shows "Syncing..." when sync in progress
    - [ ] Shows pending mutation count
    - [ ] Shows success/error messages after sync
  - **Dependencies**: Task 20, Task 33
  - **Verification**: Queue mutations, go online, watch sync status update

---

## Phase 6: Readings & GPS Verification

### 6.1 Reading Management
- [ ] **Create Reading Form Component** (Size: M) <!-- id: 36 -->
  - **What**: Build form for adding new meter reading
  - **Files**: Create `src/components/ReadingForm.tsx`
  - **Acceptance Criteria**:
    - [ ] Fields: meter value, date/time (default now), notes
    - [ ] GPS capture button
    - [ ] Auto-calculates usage since last reading
    - [ ] Validation: value must be greater than last reading
    - [ ] Submit saves to Supabase (or queues if offline)
  - **Dependencies**: Task 8, Task 12
  - **Verification**: Add reading, verify calculation and save

- [ ] **Implement GPS Range Verification** (Size: M) <!-- id: 37 -->
  - **What**: Verify GPS location is within range of well
  - **Files**: Create `src/lib/gpsVerification.ts`
  - **Acceptance Criteria**:
    - [ ] Calculates distance between current GPS and well location
    - [ ] Shows "In Range" badge if within threshold (e.g., 100m)
    - [ ] Shows "Out of Range" warning if too far
    - [ ] Configurable range threshold
  - **Dependencies**: Task 27
  - **Verification**: Mock GPS locations near/far from well, verify badge changes

- [ ] **Build Unit Conversion Utilities** (Size: S) <!-- id: 38 -->
  - **What**: Create utilities for converting between units
  - **Files**: Create `src/lib/unitConversions.ts`
  - **Acceptance Criteria**:
    - [ ] Convert acre-feet ↔ gallons
    - [ ] Convert acre-feet ↔ cubic meters
    - [ ] Format numbers with proper precision
    - [ ] Unit tests for all conversions
  - **Dependencies**: None
  - **Verification**: Write and run unit tests

### 6.2 Reading Views
- [ ] **Create Reading History View** (Size: M) <!-- id: 39 -->
  - **What**: Build page showing all readings for a well with filtering
  - **Files**: Create `src/pages/ReadingHistoryPage.tsx`
  - **Acceptance Criteria**:
    - [ ] Table/list of all readings
    - [ ] Filter by date range
    - [ ] Export to CSV functionality
    - [ ] Pagination for large datasets
  - **Dependencies**: Task 12
  - **Verification**: View history, apply filters, verify export works

- [ ] **Add Reading Detail View** (Size: S) <!-- id: 40 -->
  - **What**: Show detailed view of a single reading
  - **Files**: Create `src/components/ReadingDetail.tsx`
  - **Acceptance Criteria**:
    - [ ] Shows all reading fields
    - [ ] Map showing GPS location vs well location
    - [ ] Edit/delete buttons (for admins)
  - **Dependencies**: Task 12, Task 22
  - **Verification**: Click reading, verify detail view displays

---

## Phase 7: State Management & Data Hooks

### 7.1 Zustand Stores
- [ ] **Create Wells Store** (Size: M) <!-- id: 41 -->
  - **What**: Set up Zustand store for wells state
  - **Command**: `npm install zustand`
  - **Files**: Create `src/stores/wellsStore.ts`
  - **Acceptance Criteria**:
    - [ ] Store manages selected well, filter state
    - [ ] Actions for select/deselect well
    - [ ] Persists selected well ID
  - **Dependencies**: Task 1
  - **Verification**: Select well, verify state updates, refresh, verify persists

- [ ] **Create UI Store** (Size: S) <!-- id: 42 -->
  - **What**: Set up Zustand store for UI state
  - **Files**: Create `src/stores/uiStore.ts`
  - **Acceptance Criteria**:
    - [ ] Manages sidebar open/closed state
    - [ ] Manages modal states
    - [ ] Manages loading states
  - **Dependencies**: Task 41
  - **Verification**: Toggle sidebar, verify state persists

### 7.2 Custom Hooks
- [ ] **Create useWells Hook** (Size: M) <!-- id: 43 -->
  - **What**: Custom hook for querying wells from PowerSync
  - **Files**: Create `src/hooks/useWells.ts`
  - **Acceptance Criteria**:
    - [ ] Returns reactive query of wells
    - [ ] Accepts filter parameters
    - [ ] Returns loading state
    - [ ] Auto-updates when data changes
  - **Dependencies**: Task 12
  - **Verification**: Use hook in component, verify reactivity

- [ ] **Create useReadings Hook** (Size: M) <!-- id: 44 -->
  - **What**: Custom hook for querying readings from PowerSync
  - **Files**: Create `src/hooks/useReadings.ts`
  - **Acceptance Criteria**:
    - [ ] Returns readings for a specific well
    - [ ] Calculates usage between readings
    - [ ] Returns loading state
  - **Dependencies**: Task 12
  - **Verification**: Use hook in component, verify data loads

- [ ] **Create useOnlineStatus Hook** (Size: S) <!-- id: 45 -->
  - **What**: Custom hook for tracking online/offline status
  - **Files**: Create `src/hooks/useOnlineStatus.ts`
  - **Acceptance Criteria**:
    - [ ] Returns boolean isOnline state
    - [ ] Subscribes to online/offline events
    - [ ] Cleans up listeners on unmount
  - **Dependencies**: None
  - **Verification**: Toggle network, verify hook updates

---

## Phase 8: UI Polish & Accessibility

### 8.1 Loading States
- [ ] **Create Loading Skeleton Components** (Size: M) <!-- id: 46 -->
  - **What**: Build skeleton loaders for all list views
  - **Files**: Create `src/components/skeletons/`
  - **Acceptance Criteria**:
    - [ ] Skeleton for well list items
    - [ ] Skeleton for reading list items
    - [ ] Skeleton for detail views
    - [ ] Animated shimmer effect
  - **Dependencies**: Task 2
  - **Verification**: View components while loading, verify skeletons display

- [ ] **Add Error Boundaries** (Size: S) <!-- id: 47 -->
  - **What**: Implement error boundaries for graceful error handling
  - **Files**: Create `src/components/ErrorBoundary.tsx`
  - **Acceptance Criteria**:
    - [ ] Catches errors in component tree
    - [ ] Displays user-friendly error message
    - [ ] Logs errors to console
    - [ ] Provides "retry" action
  - **Dependencies**: Task 1
  - **Verification**: Trigger error in component, verify boundary catches it

### 8.2 Accessibility
- [ ] **Add ARIA Labels** (Size: M) <!-- id: 48 -->
  - **What**: Add appropriate ARIA labels to all interactive elements
  - **Files**: Modify all component files
  - **Acceptance Criteria**:
    - [ ] All buttons have aria-label or accessible text
    - [ ] Form inputs have associated labels
    - [ ] Navigation has proper landmarks
    - [ ] Status messages use aria-live
  - **Dependencies**: All component tasks
  - **Verification**: Run axe DevTools, verify no critical issues

- [ ] **Test Keyboard Navigation** (Size: M) <!-- id: 49 -->
  - **What**: Ensure all functionality accessible via keyboard
  - **Files**: Test all interactive components
  - **Acceptance Criteria**:
    - [ ] Can navigate entire app with Tab/Shift+Tab
    - [ ] Enter/Space activate buttons
    - [ ] Escape closes modals
    - [ ] Focus visible on all interactive elements
  - **Dependencies**: All component tasks
  - **Verification**: Navigate app using only keyboard, verify all actions possible

### 8.3 Visual Polish
- [ ] **Optimize Images and Icons** (Size: S) <!-- id: 50 -->
  - **What**: Ensure all assets are optimized
  - **Files**: `public/` directory
  - **Acceptance Criteria**:
    - [ ] PWA icons properly sized (192x192, 512x512)
    - [ ] SVG icons used where possible
    - [ ] Images compressed
  - **Dependencies**: Task 4
  - **Verification**: Check asset sizes, verify no unnecessarily large files

- [ ] **Add Loading Transitions** (Size: S) <!-- id: 51 -->
  - **What**: Add smooth transitions between states
  - **Files**: Modify component files
  - **Acceptance Criteria**:
    - [ ] Fade transitions for page changes
    - [ ] Smooth animations for list updates
    - [ ] Loading spinner for async operations
  - **Dependencies**: Task 2
  - **Verification**: Navigate app, verify smooth transitions

---

## Phase 9: Testing

### 9.1 Unit Tests
- [ ] **Set Up Testing Framework** (Size: S) <!-- id: 52 -->
  - **What**: Configure Vitest for unit testing
  - **Command**: `npm install -D vitest @testing-library/react @testing-library/jest-dom`
  - **Files**: Create `vitest.config.ts`
  - **Acceptance Criteria**:
    - [ ] Vitest configured
    - [ ] Testing library installed
    - [ ] Can run tests with `npm test`
  - **Dependencies**: Task 1
  - **Verification**: Run `npm test`, verify framework works

- [ ] **Write Utility Function Tests** (Size: M) <!-- id: 53 -->
  - **What**: Write tests for all utility functions
  - **Files**: Create `src/lib/__tests__/`
  - **Acceptance Criteria**:
    - [ ] Tests for unit conversions (acre-feet ↔ gallons)
    - [ ] Tests for GPS distance calculation
    - [ ] Tests for date formatting utilities
    - [ ] All tests pass
    - [ ] >80% code coverage for utilities
  - **Dependencies**: Task 38, Task 52
  - **Verification**: Run tests, verify all pass

- [ ] **Write Component Tests** (Size: L) <!-- id: 54 -->
  - **What**: Write tests for critical components
  - **Files**: Create component test files
  - **Acceptance Criteria**:
    - [ ] Tests for WellForm validation
    - [ ] Tests for AllocationGauge calculations
    - [ ] Tests for ReadingForm
    - [ ] Mock Supabase and PowerSync
  - **Dependencies**: Task 52
  - **Verification**: Run tests, verify all pass

### 9.2 Integration Tests
- [ ] **Test Offline Sync Flow** (Size: L) <!-- id: 55 -->
  - **What**: Manually test complete offline flow
  - **Files**: Manual test checklist
  - **Acceptance Criteria**:
    - [ ] Can add well while offline
    - [ ] Can add reading while offline
    - [ ] Offline indicator shows correct status
    - [ ] Data syncs when back online
    - [ ] No data loss
  - **Dependencies**: Task 32, Task 33, Task 34
  - **Verification**: Execute full offline scenario, document results

- [ ] **Test GPS Verification Flow** (Size: M) <!-- id: 56 -->
  - **What**: Manually test GPS capture and verification
  - **Files**: Manual test checklist
  - **Acceptance Criteria**:
    - [ ] GPS location captured successfully
    - [ ] In-range verification works correctly
    - [ ] Out-of-range warning displays
    - [ ] Works on mobile device
  - **Dependencies**: Task 27, Task 37
  - **Verification**: Test with real GPS on mobile device

- [ ] **Test PWA Installation** (Size: S) <!-- id: 57 -->
  - **What**: Test PWA install on mobile and desktop
  - **Files**: Manual test checklist
  - **Acceptance Criteria**:
    - [ ] Install prompt appears
    - [ ] App installs successfully
    - [ ] App launches from home screen
    - [ ] Works offline after installation
  - **Dependencies**: Task 4
  - **Verification**: Install on Android/iOS, verify functionality

---

## Phase 10: Deployment & Documentation

### 10.1 Production Build
- [ ] **Configure Production Environment** (Size: S) <!-- id: 58 -->
  - **What**: Set up production environment variables
  - **Files**: Create `.env.production` template
  - **Acceptance Criteria**:
    - [ ] Production Supabase URL and key
    - [ ] Production Mapbox token
    - [ ] Production PowerSync endpoint
    - [ ] All secrets documented in deployment guide
  - **Dependencies**: None
  - **Verification**: Build with production env, verify correct API endpoints used

- [ ] **Build and Test Production Bundle** (Size: M) <!-- id: 59 -->
  - **What**: Create optimized production build
  - **Command**: `npm run build`
  - **Acceptance Criteria**:
    - [ ] Build completes without errors
    - [ ] Bundle size optimized (<800KB gzipped, Mapbox GL JS alone is ~200KB+)
    - [ ] Service worker registered
    - [ ] PWA install works
    - [ ] All features work in production build
  - **Dependencies**: All previous tasks
  - **Verification**: Serve production build locally, test all features

- [ ] **Deploy to Hosting Platform** (Size: M) <!-- id: 60 -->
  - **What**: Deploy app to production hosting (Vercel/Netlify)
  - **Files**: Create deployment configuration
  - **Acceptance Criteria**:
    - [ ] App deployed to production URL
    - [ ] Environment variables configured
    - [ ] HTTPS enabled
    - [ ] PWA install prompt appears
    - [ ] All features functional
  - **Dependencies**: Task 59
  - **Verification**: Access production URL, test critical flows

### 10.2 Documentation
- [ ] **Write User Guide** (Size: M) <!-- id: 61 -->
  - **What**: Create end-user documentation
  - **Files**: Create `docs/USER_GUIDE.md`
  - **Acceptance Criteria**:
    - [ ] How to create a farm
    - [ ] How to add wells
    - [ ] How to record readings
    - [ ] How to use offline mode
    - [ ] Screenshots included
  - **Dependencies**: All features complete
  - **Verification**: Have someone follow guide, verify clarity

- [ ] **Update README** (Size: S) <!-- id: 62 -->
  - **What**: Complete project README
  - **Files**: Modify `README.md`
  - **Acceptance Criteria**:
    - [ ] Project description
    - [ ] Features list
    - [ ] Setup instructions (link to SETUP.md)
    - [ ] Tech stack
    - [ ] Screenshots
  - **Dependencies**: All features complete
  - **Verification**: Review README for completeness

---

## Completion Checklist
- [ ] All 62 tasks completed
- [ ] All tests passing
- [ ] Production deployment successful
- [ ] User documentation complete
- [ ] No critical bugs in issue tracker

**🎉 Project Complete!**
