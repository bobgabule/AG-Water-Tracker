# Architecture Documentation - AG Water Tracker

This document provides a deep dive into the technical architecture, design decisions, and implementation patterns for the AG Water Tracker PWA.

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [Component Hierarchy](#component-hierarchy)
4. [Folder Structure](#folder-structure)
5. [State Management](#state-management)
6. [Offline & Sync Deep Dive](#offline--sync-deep-dive)
7. [Security Architecture](#security-architecture)
8. [Performance Considerations](#performance-considerations)
9. [Alternative Implementations](#alternative-implementations)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌──────────────┐                            │
│  │  React App    │  │  Service     │                            │
│  │  Components   │  │  Worker      │                            │
│  └───────┬───────┘  └──────┬───────┘                            │
│          │                 │                                     │
│  ┌───────▼─────────────────▼────────────────────────────────┐   │
│  │              PowerSync (Local SQLite DB)                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐ │   │
│  │  │  wells   │ │  users   │ │ readings  │ │allocations │ │   │
│  │  └──────────┘ └──────────┘ └───────────┘ └────────────┘ │   │
│  └───────────────────────┬────────────────────────────────────┘ │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    Sync ↕ (WebSocket)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      PowerSync Service                           │
│                   (Sync Orchestration)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    Replication ↕
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Supabase (PostgreSQL)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐        │
│  │  wells   │ │  users   │ │ readings  │ │allocations │        │
│  └──────────┘ └──────────┘ └───────────┘ └────────────┘        │
│                                                                  │
│  ┌───────────────────────────────────────────────────┐          │
│  │        RLS Policies (Row Level Security)          │          │
│  └───────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌───────────────────────────────────────────────────┐          │
│  │           Supabase Auth (JWT Tokens)              │          │
│  └───────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────────┘
```

### Key Components

**Client Layer:**
- **React App**: UI components, business logic, routing
- **Service Worker**: PWA functionality, app shell caching
- **PowerSync Local DB**: SQLite database for offline-first data access (includes built-in CRUD upload queue)

**Sync Layer:**
- **PowerSync Service**: Manages real-time sync between client and server
- Uses WebSocket for live updates
- Handles conflict resolution

**Backend Layer:**
- **Supabase PostgreSQL**: Source of truth for all data
- **Supabase Auth**: Authentication and user management
- **Row Level Security**: Multi-tenant data isolation

---

## Data Flow Diagrams

### User Adds Reading (Online)

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────┐
│  User    │────▶│ ReadingForm  │────▶│ PowerSync       │────▶│ Supabase │
│ clicks   │     │ (Component)  │     │ (Local Write +  │     │ (INSERT) │
│ Submit   │     │              │     │  uploadData)    │     │          │
└──────────┘     └──────────────┘     └─────────────────┘     └────┬─────┘
                        │                                           │
                        ▼                                           │
                 ┌──────────────┐                                   │
                 │ Optimistic   │                                   │
                 │ UI Update    │                                   │
                 └──────────────┘                                   │
                                                                    │
                                                              Sync  │
                                                                    ▼
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────┐
│  User    │◀────│ ReadingsList │◀────│  PowerSync      │◀────│ Supabase │
│ sees new │     │ (Re-renders) │     │  (Sync Down)    │     │          │
│ reading  │     │              │     │                 │     │          │
└──────────┘     └──────────────┘     └─────────────────┘     └──────────┘
```

### User Adds Reading (Offline)

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  User    │────▶│ ReadingForm  │────▶│ PowerSync       │
│ clicks   │     │ (Component)  │     │ (Local SQLite   │
│ Submit   │     │              │     │  Write + Queue) │
└──────────┘     └──────────────┘     └─────────────────┘
                        │                       │
                        ▼                       │
                 ┌──────────────┐               │
                 │ Optimistic   │               │
                 │ UI Update    │               │
                 │ (Show in UI  │               │
                 │  with "sync  │               │
                 │   pending")  │               │
                 └──────────────┘               │
                                                │
                    ... User Goes Online ...    │
                                                │
                                                ▼
                 ┌─────────────────┐     ┌──────────┐
                 │ PowerSync calls │────▶│ Supabase │
                 │ uploadData()   │     │ (INSERT) │
                 └─────────────────┘     └────┬─────┘
                                              │
                                        Sync  │
                                              ▼
┌──────────┐     ┌──────────────┐     ┌──────────┐
│  User    │◀────│ UI Update    │◀────│PowerSync │
│ sees     │     │ (Remove      │     │(Sync     │
│ synced   │     │  pending)    │     │ Down)    │
│ indicator│     │              │     │          │
└──────────┘     └──────────────┘     └──────────┘
```

### User Views Well List (Offline)

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  User    │────▶│  WellList    │────▶│  PowerSync      │
│ navigates│     │  Component   │     │  Local DB       │
│ to wells │     │              │     │  (SELECT)       │
└──────────┘     └──────┬───────┘     └────────┬────────┘
                        │                      │
                        │  ◀───── Data ────────┘
                        │  (Instant, no network)
                        ▼
                 ┌──────────────┐
                 │  UI Renders  │
                 │  Well List   │
                 └──────────────┘
```

---

## Component Hierarchy

```
App.tsx (Router)
│
├─ AuthContext (Wraps entire app)
│  └─ PowerSyncContext (Wraps entire app)
│
├─ Public Routes
│  ├─ LoginPage
│  ├─ RegisterPage
│  └─ FarmSetupPage
│
└─ Protected Routes (Requires auth + farm)
   │
   └─ Layout
      ├─ Header
      │  ├─ FarmName
      │  ├─ OfflineIndicator
      │  └─ UserMenu
      │
      ├─ Sidebar (Desktop) / Drawer (Mobile)
      │  ├─ Navigation
      │  └─ WellList
      │     ├─ WellListItem (repeating)
      │     └─ WellListFilters
      │
      └─ Main Content Area
         │
         ├─ DashboardPage
         │  └─ MapView
         │     ├─ MapboxMap
         │     └─ WellMarker (for each well)
         │
         ├─ WellDetailPage
         │  ├─ WellDetail
         │  │  ├─ AllocationGauge
         │  │  ├─ ReadingsList
         │  │  │  └─ ReadingsListItem (repeating)
         │  │  └─ MapSnippet
         │  └─ AddReadingButton → Opens Modal
         │
         ├─ AddWellPage (Modal or Full Page)
         │  └─ WellForm
         │     ├─ TextInput (name, meter_id)
         │     ├─ GPSCapture
         │     └─ SubmitButton
         │
         ├─ ReadingHistoryPage
         │  ├─ ReadingsTable
         │  ├─ DateRangeFilter
         │  └─ ExportButton
         │
         └─ AddReadingPage (Modal or Full Page)
            └─ ReadingForm
               ├─ NumberInput (meter_value)
               ├─ DateTimePicker
               ├─ GPSCapture
               ├─ GPSVerificationBadge
               └─ SubmitButton
```

### Component Responsibilities

| Component | Responsibility | State/Data Source |
|-----------|----------------|-------------------|
| `Layout` | Overall app structure, responsive layout | None |
| `Header` | Navigation, farm name, offline status | AuthContext |
| `OfflineIndicator` | Show online/offline status | useOnlineStatus hook |
| `MapView` | Display map with well markers | useWells hook (PowerSync) |
| `WellList` | List all wells with filters | useWells hook (PowerSync) |
| `WellDetail` | Show well details and readings | useWell hook, useReadings hook |
| `AllocationGauge` | Visual gauge for allocation usage | Props (allocation, used) |
| `ReadingsList` | Display reading history | useReadings hook |
| `WellForm` | Create/edit well form | Local state + mutations |
| `ReadingForm` | Add reading form | Local state + mutations |
| `GPSCapture` | Capture GPS coordinates | useGeolocation hook |
| `ErrorBoundary` | Catch and display component errors | Local state |

---

## Folder Structure

```
AG-Water-Tracker/
├── docs/                       # Documentation
│   ├── implementation_plan.md
│   ├── task.md
│   ├── SETUP.md
│   ├── API.md
│   └── ARCHITECTURE.md (this file)
│
├── public/                     # Static assets
│   ├── manifest.json           # PWA manifest
│   ├── icons/                  # PWA icons (192x192, 512x512)
│   └── robots.txt
│
├── supabase/
│   └── migrations/             # SQL migration files
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
│
├── src/
│   ├── App.tsx                 # Root component with router
│   ├── main.tsx                # Entry point
│   ├── index.css               # Global styles (Tailwind imports)
│   │
│   ├── components/             # React components
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── MapView.tsx
│   │   ├── WellMarker.tsx
│   │   ├── WellList.tsx
│   │   ├── WellListItem.tsx
│   │   ├── WellDetail.tsx
│   │   ├── AllocationGauge.tsx
│   │   ├── ReadingsList.tsx
│   │   ├── ReadingsListItem.tsx
│   │   ├── WellForm.tsx
│   │   ├── ReadingForm.tsx
│   │   ├── GPSCapture.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── skeletons/          # Loading skeletons
│   │       ├── WellListSkeleton.tsx
│   │       └── ReadingsListSkeleton.tsx
│   │
│   ├── pages/                  # Page components (route targets)
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── FarmSetupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── WellDetailPage.tsx
│   │   ├── AddWellPage.tsx
│   │   ├── ReadingHistoryPage.tsx
│   │   └── AddReadingPage.tsx
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   ├── usePowerSync.ts     # PowerSync database hook
│   │   ├── useWells.ts         # Query wells from PowerSync
│   │   ├── useReadings.ts      # Query readings from PowerSync
│   │   ├── useGeolocation.ts   # GPS location capture
│   │   └── useOnlineStatus.ts  # Online/offline detection
│   │
│   ├── lib/                    # Utilities and services
│   │   ├── supabase.ts         # Supabase client initialization
│   │   ├── powersync.ts        # PowerSync database initialization
│   │   ├── powersync-schema.ts # PowerSync schema definition
│   │   ├── powersync-connector.ts # PowerSync backend connector (handles uploads)
│   │   ├── gpsVerification.ts  # GPS range verification
│   │   ├── unitConversions.ts  # Acre-feet ↔ gallons conversions
│   │   ├── AuthContext.tsx     # Auth context provider
│   │   ├── PowerSyncContext.tsx # PowerSync context provider
│   │   └── __tests__/          # Unit tests for utilities
│   │       ├── unitConversions.test.ts
│   │       └── gpsVerification.test.ts
│   │
│   ├── stores/                 # Zustand state stores
│   │   ├── wellsStore.ts       # Wells UI state (selected well, filters)
│   │   └── uiStore.ts          # UI state (sidebar open, modals)
│   │
│   └── types/                  # TypeScript type definitions
│       ├── database.ts         # Database table types
│       ├── supabase.ts         # Supabase-generated types
│       └── index.ts            # Shared types
│
├── .env                        # Environment variables (not committed)
├── .env.example                # Template for .env
├── .gitignore
├── package.json
├── tsconfig.json               # TypeScript configuration
├── # Tailwind CSS v4: configured via @theme in src/index.css and @tailwindcss/vite plugin
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest test configuration
└── README.md
```

---

## State Management

### Strategy: Hybrid Approach

We use a **hybrid state management** approach combining:
1. **PowerSync (SQLite)** for server-synced data
2. **Zustand** for client-side UI state
3. **React Context** for auth and global services

### PowerSync for Data State

All backend data (wells, readings, allocations, users) is managed through PowerSync:

```typescript
// useWells.ts
import { useMemo } from 'react';
import { usePowerSync, useQuery } from '@powersync/react';
import { useAuth } from '../context/AuthContext';

export const useWells = (filters?: WellFilters) => {
  const db = usePowerSync();
  const { currentFarmId } = useAuth();

  const query = useMemo(() => {
    let sql = 'SELECT * FROM wells WHERE farm_id = ?';
    const params = [currentFarmId];

    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }

    return { sql, params };
  }, [filters]);

  return useQuery(query);
};
```

**Why PowerSync?**
- Automatic sync with backend
- Offline-first: Data always available
- Real-time updates via WebSocket
- SQL queries for complex filtering

### Zustand for UI State

UI state (sidebar open, selected well, modal states) uses Zustand:

```typescript
// wellsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WellsStore {
  selectedWellId: string | null;
  filterStatus: 'all' | 'alive' | 'dead';
  selectWell: (id: string) => void;
  setFilterStatus: (status: string) => void;
}

export const useWellsStore = create<WellsStore>()(
  persist(
    (set) => ({
      selectedWellId: null,
      filterStatus: 'all',
      selectWell: (id) => set({ selectedWellId: id }),
      setFilterStatus: (status) => set({ filterStatus: status }),
    }),
    { name: 'wells-store' }
  )
);
```

**Why Zustand?**
- Lightweight and simple
- Persistence out of the box
- No boilerplate
- Great TypeScript support

### React Context for Services

Global services (auth, PowerSync instance) use React Context:

```typescript
// AuthContext.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

---

## Offline & Sync Deep Dive

### Architecture Decision: Offline-First

**Problem**: Standard Supabase client fails when offline. Users in remote agricultural areas have unreliable connectivity.

**Solution**: Use PowerSync's built-in CRUD upload queue. All local writes are automatically queued and uploaded via the `uploadData()` method in the backend connector.

### PowerSync Backend Connector (Upload)

```typescript
// powersync-connector.ts
import { AbstractPowerSyncDatabase, CrudEntry, PowerSyncBackendConnector } from '@powersync/web';
import { supabase } from './supabase';

export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        await this.applyOperation(op);
      }
      await transaction.complete();
    } catch (error: any) {
      // 5xx errors: throw to retry later
      // Validation errors: log and complete to avoid blocking queue
      if (error?.status >= 500) {
        throw error;
      }
      console.error('Upload error (non-retryable):', error);
      await transaction.complete();
    }
  }

  private async applyOperation(op: CrudEntry) {
    const table = op.table;
    const data = { ...op.opData, id: op.id };

    switch (op.op) {
      case 'PUT':
        await supabase.from(table).upsert(data);
        break;
      case 'PATCH':
        await supabase.from(table).update(op.opData).eq('id', op.id);
        break;
      case 'DELETE':
        await supabase.from(table).delete().eq('id', op.id);
        break;
    }
  }
}
```

### How Writes Work

All data mutations go through PowerSync's local SQLite database:

```typescript
// Example: Adding a reading (works offline automatically)
const db = usePowerSync();

await db.execute(
  `INSERT INTO readings (id, well_id, meter_value, reading_date, gps_latitude, gps_longitude, gps_verified, created_by)
   VALUES (uuid(), ?, ?, ?, ?, ?, ?, ?)`,
  [wellId, meterValue, readingDate, lat, lon, verified, userId]
);
// Change is instantly visible in UI via local SQLite
// PowerSync queues the write and calls uploadData() when online
```

No custom IndexedDB queue or wrapped Supabase client is needed — PowerSync handles all queueing, retry, and sync internally.
```

### Conflict Resolution

**Strategy**: Last-Write-Wins (LWW)

When two users edit the same record offline and sync later:
1. PowerSync uses `updated_at` timestamp to determine winner
2. Later timestamp wins
3. Previous changes are overwritten (no merge)

**Alternative**: Custom conflict resolution can be implemented by:
- Storing conflict metadata
- Presenting conflicts to user for manual resolution
- Implementing field-level merging

---

## Security Architecture

### Authentication Flow

```
1. User enters email/password
   ↓
2. Supabase Auth validates credentials
   ↓
3. Returns JWT token (stored in localStorage)
   ↓
4. JWT included in all API requests (Authorization header)
   ↓
5. Supabase validates JWT
   ↓
6. RLS policies check user permissions
   ↓
7. Data returned (filtered by RLS)
```

### Row Level Security (RLS)

RLS ensures multi-tenant data isolation:

**Example**: Users can only see wells from their farm

```sql
CREATE POLICY "Users can view farm wells"
  ON wells FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM users WHERE id = auth.uid()
    )
  );
```

**How it works**:
1. User makes query: `SELECT * FROM wells`
2. Supabase automatically appends RLS filter
3. Effective query: `SELECT * FROM wells WHERE farm_id = (user's farm)`
4. User cannot bypass this (enforced at database level)

### API Key Security

**Supabase Anon Key**: Safe to expose in client code
- Only grants access allowed by RLS policies
- Cannot bypass security

**Service Role Key**: NEVER expose in client code
- Has admin access, bypasses RLS
- Only use server-side (PowerSync configuration)

**Mapbox Token**: Public token with limited scopes
- Only allows reading map styles and tiles
- No write access

### Data Encryption

- **In Transit**: All API calls use HTTPS (TLS 1.3)
- **At Rest**: Supabase encrypts database at rest (AES-256)
- **Local Storage**: PowerSync SQLite not encrypted (device security)

---

## Performance Considerations

### Database Indexing

Critical indexes for performance:

```sql
-- Well queries by farm
CREATE INDEX idx_wells_farm_id ON wells(farm_id);

-- Latest reading for a well
CREATE INDEX idx_readings_well_date ON readings(well_id, reading_date DESC);

-- Spatial queries (GPS range)
CREATE INDEX idx_wells_location ON wells USING GIST(location);
```

### React Optimization

**Memoization**:
```typescript
const AllocationGauge = memo(({ allocation, used }: Props) => {
  const percentage = useMemo(() => (used / allocation) * 100, [used, allocation]);
  // ...
});
```

**Virtual Scrolling**: For long reading lists (100+ items), use `@tanstack/react-virtual`:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: readings.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80,
});

<div ref={parentRef} style={{ height: 600, overflow: 'auto' }}>
  <div style={{ height: virtualizer.getTotalSize() }}>
    {virtualizer.getVirtualItems().map((virtualRow) => (
      <ReadingListItem
        key={virtualRow.key}
        reading={readings[virtualRow.index]}
        style={{ transform: `translateY(${virtualRow.start}px)` }}
      />
    ))}
  </div>
</div>
```

### Bundle Size Optimization

- **Code Splitting**: Lazy load routes
  ```typescript
  const AddWellPage = lazy(() => import('./pages/AddWellPage'));
  ```
- **Tree Shaking**: Import only needed components
  ```typescript
  import { ChevronRightIcon } from '@heroicons/react/24/outline';  // Good
  import * as Icons from '@heroicons/react/24/outline';  // Bad
  ```
- **Target**: <800KB gzipped total bundle (Mapbox GL JS alone is ~200KB+)

---

## Alternative Implementations

### Option 1: Use Leaflet Instead of Mapbox

**Why**: Free, no API key required

**Changes**:
```bash
npm install react-leaflet leaflet
```

```typescript
// MapView.tsx
import { MapContainer, TileLayer, Marker } from 'react-leaflet';

<MapContainer center={[36.7783, -119.4179]} zoom={13}>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; OpenStreetMap contributors'
  />
  {wells.map(well => (
    <Marker position={[well.lat, well.lon]} key={well.id} />
  ))}
</MapContainer>
```

**Pros**: Free, no limits
**Cons**: Fewer styling options, slower tile loading

### Option 2: Self-Hosted Backend (Instead of Supabase)

**Stack**: PostgreSQL + PostgREST + Custom Auth

**Why**: Full control, no vendor lock-in

**Complexity**: High - requires DevOps knowledge

### Option 3: Local-First with ElectricSQL (Instead of PowerSync)

**Why**: Open source, similar functionality

**Changes**: Replace PowerSync SDK with ElectricSQL

**Consideration**: ElectricSQL has evolved significantly; evaluate current feature parity with PowerSync before choosing

---

## Next Steps

- For database schema: See [API.md](API.md)
- For setup instructions: See [SETUP.md](SETUP.md)
- For task breakdown: See [task.md](task.md)

