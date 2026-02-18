# Architecture Patterns

**Domain:** Meter reading recording, allocation management, GPS proximity verification, well detail/edit, and meter problem reporting for offline-first agricultural water management PWA
**Researched:** 2026-02-19
**Confidence:** HIGH

## Recommended Architecture

### System Overview: New Feature Integration

```
+------------------------------------------------------------------+
|                    CLIENT (Browser / PWA)                          |
+------------------------------------------------------------------+
|                                                                   |
|  PAGES (new)                                                      |
|  +---------------------------+  +----------------------------+    |
|  | WellDetailPage            |  | RecordReadingPage          |    |
|  | /wells/:id                |  | /wells/:id/readings/new    |    |
|  +---------------------------+  +----------------------------+    |
|                                                                   |
|  COMPONENTS (new)                                                 |
|  +--------------------+  +--------------------+                   |
|  | ReadingsList        |  | AllocationCard     |                  |
|  | ReadingEntry        |  | AllocationForm     |                  |
|  | MeterProblemFields  |  | WellEditSheet      |                  |
|  | GpsProximityBadge   |  | SimilarReadingWarn |                  |
|  +--------------------+  +--------------------+                   |
|                                                                   |
|  HOOKS (new)                                                      |
|  +--------------------+  +--------------------+                   |
|  | useReadings(wellId) |  | useAllocations     |                  |
|  | useWell(wellId)     |  |   (wellId)         |                  |
|  | useLatestReading    |  | useGpsProximity    |                  |
|  |   (wellId)          |  |   (wellLat,wellLng)|                  |
|  +--------------------+  +--------------------+                   |
|                                                                   |
|  LIB (new)                                                        |
|  +--------------------+  +--------------------+                   |
|  | gpsProximity.ts     |  | unitConversions.ts |                  |
|  | (@turf/distance)    |  | (AF/GAL/CF math)   |                  |
|  +--------------------+  +--------------------+                   |
|                                                                   |
|  EXISTING (modified)                                              |
|  +------------------------------------------------------+        |
|  | powersync-schema.ts  -- add readings, allocations     |        |
|  | powersync-connector.ts -- add to ALLOWED_TABLES,      |        |
|  |                          normalizeForSupabase          |        |
|  | App.tsx -- add /wells/:id, /wells/:id/readings/new     |        |
|  | WellMarker.tsx -- show allocation % from real data     |        |
|  +------------------------------------------------------+        |
|                                                                   |
|  +------------------------------------------------------+        |
|  | PowerSync Local SQLite                                |        |
|  | [farms] [users] [farm_members] [farm_invites]         |        |
|  | [wells] [readings*] [allocations*]  (* = NEW)         |        |
|  +------------------------------------------------------+        |
+------------------------------------------------------------------+
           |
    Sync via WebSocket (bidirectional)
           |
+----------v-------------------------------------------------------+
|                    POWERSYNC SERVICE                               |
|  Sync Rules (updated):                                            |
|  - readings: for farm's wells                                     |
|  - allocations: for farm's wells                                  |
|  - (existing buckets unchanged)                                   |
+----------+-------------------------------------------------------+
           |
+----------v-------------------------------------------------------+
|                    SUPABASE (PostgreSQL)                           |
|  Tables (NEW migration needed -- old ones were dropped):          |
|  - readings (id, well_id, meter_value, reading_date,             |
|              gps_latitude, gps_longitude, gps_accuracy,           |
|              gps_verified, notes, problem_type, problem_notes,    |
|              created_by, created_at, updated_at)                  |
|  - allocations (id, well_id, period_start, period_end,           |
|                 allocated_amount, allocated_units, notes,          |
|                 created_at, updated_at)                            |
|                                                                   |
|  RLS Policies (NEW migration needed):                             |
|  - "Members can view farm readings/allocations"                   |
|  - "Members can create readings"                                  |
|  - "Admins can create/update/delete allocations"                  |
+------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `WellDetailPage` | Well info, readings list, allocation status, action buttons | useWell, useReadings, useAllocations, useUserRole |
| `RecordReadingPage` | Meter value input, GPS capture, validation, save | useGeolocation, useLatestReading, usePowerSync, gpsProximity |
| `ReadingsList` | Scrollable list of recent readings for a well | useReadings (or receives data via props) |
| `ReadingEntry` | Single reading row (value, date, GPS badge, usage delta) | Props only (pure display) |
| `AllocationCard` | Current allocation, usage bar, remaining amount | Props (allocation + usage data from parent) |
| `AllocationForm` | Bottom sheet to create/edit allocation | usePowerSync for writes |
| `WellEditBottomSheet` | Edit well properties (reuses AddWellForm pattern) | usePowerSync for writes |
| `MeterProblemFields` | Problem type select + notes within reading form | Props only (controlled inputs) |
| `GpsProximityBadge` | Green check / yellow warning for GPS verification | Props only (isInRange, distanceMeters) |
| `SimilarReadingWarning` | Warning when reading is lower than or equal to previous | Props only (pure display) |
| `useWell(wellId)` | Single well query by ID | PowerSync useQuery |
| `useReadings(wellId, options?)` | Readings for a well, sorted by date desc | PowerSync useQuery |
| `useAllocations(wellId)` | Allocations for a well | PowerSync useQuery |
| `useLatestReading(wellId)` | Most recent reading for comparison | PowerSync useQuery |
| `useGpsProximity(wellLat, wellLng)` | Combines useGeolocation with @turf/distance | useGeolocation, @turf/distance |
| `gpsProximity.ts` | Haversine distance, threshold check | @turf/distance (pure function) |
| `unitConversions.ts` | AF/GAL/CF conversion, multiplier application | Pure function, no dependencies |

### Data Flow

#### Recording a Meter Reading (Complete Flow)

```
User on WellDetailPage (/wells/:id)
    |
    | taps "Record Reading"
    v
Navigate to /wells/:id/readings/new (RecordReadingPage)
    |
    | 1. useGeolocation auto-requests GPS (enableHighAccuracy: true)
    | 2. useLatestReading(wellId) fetches previous reading from local SQLite
    | 3. useWell(wellId) fetches well location + units + multiplier
    v
GPS resolves -> GpsProximityBadge shows "In Range" or "Out of Range"
    |
User enters meter_value
    |
    | Client-side checks (warnings, not blockers):
    | a) @turf/distance(userLocation, wellLocation) > 100m?
    |    -> Show "Out of Range" warning. gps_verified = false.
    | b) meter_value <= previousReading.meter_value?
    |    -> Show SimilarReadingWarning. Allow override.
    | c) GPS unavailable?
    |    -> Show "No GPS" indicator. Allow save. gps_verified = false.
    v
User taps "Save"
    |
    v
db.execute('INSERT INTO readings ...')     [PowerSync Local Write]
    | id: crypto.randomUUID()
    | meter_value: entered value (as number, stored as TEXT in PowerSync)
    | reading_date: new Date().toISOString()
    | gps_latitude/longitude: from geolocation (or null)
    | gps_accuracy: coords.accuracy (or null)
    | gps_verified: 1 if in range, 0 otherwise (INTEGER for BOOLEAN)
    | problem_type: selected problem or 'none'
    | problem_notes: text (or null)
    | created_by: user.id
    v
Optimistic UI update -- reading immediately visible in ReadingsList
    |
Navigate back to /wells/:id
    |
    | [Background: PowerSync uploadData()]
    v
SupabaseConnector.applyOperation()
    | normalizeForSupabase: gps_verified 0/1 -> true/false
    | supabase.from('readings').upsert(data)
    | RLS: "Members can create readings" -> passes
    v
Sync: reading confirmed on all farm members' devices
```

#### Usage Calculation Flow

```
AllocationCard receives: well, readings[], allocation
    |
    v
1. Filter readings to current allocation period
   (reading_date >= period_start AND reading_date <= period_end)
    |
2. Sort by reading_date ASC
   firstReading = readings[0]
   lastReading = readings[last]
    |
3. rawDelta = parseFloat(lastReading.meter_value)
              - parseFloat(firstReading.meter_value)
    |
4. multipliedDelta = rawDelta * MULTIPLIER_MAP[well.multiplier]
   (where MULTIPLIER_MAP = { '0.01': 0.01, '1': 1, '10': 10,
                              '1000': 1000, 'MG': 1_000_000 })
    |
5. Convert to allocation units:
   usageInAllocUnits = convertUnits(
     multipliedDelta, well.units, allocation.allocated_units
   )
    |
6. percentage = (usageInAllocUnits / parseFloat(allocation.allocated_amount)) * 100
    |
    v
Display:
  - Progress bar (green < 75%, yellow 75-90%, red > 90%)
  - "Used: XX.XX AF of YY.YY AF (ZZ%)"
  - "Remaining: RR.RR AF"
```

**Edge cases:**
- No readings in period: 0% usage
- No allocation for period: "No allocation set" (no progress bar)
- Only 1 reading: 0 usage (need 2+ for delta)
- Negative delta (meter replaced/reset): Show 0 usage with warning

---

## PowerSync Schema Additions

### readings table

```typescript
const readings = new TableV2({
  well_id: column.text,
  meter_value: column.text,        // TEXT to preserve decimal precision
  reading_date: column.text,       // TIMESTAMPTZ as ISO 8601 string
  gps_latitude: column.real,       // OK as float -- GPS is inherently imprecise
  gps_longitude: column.real,
  gps_accuracy: column.real,       // Accuracy in meters from Geolocation API
  gps_verified: column.integer,    // BOOLEAN -> INTEGER 0/1
  notes: column.text,
  problem_type: column.text,       // 'none' | 'broken_meter' | etc.
  problem_notes: column.text,
  created_by: column.text,
  created_at: column.text,
  updated_at: column.text,
});
```

### allocations table

```typescript
const allocations = new TableV2({
  well_id: column.text,
  period_start: column.text,       // DATE as 'YYYY-MM-DD' string
  period_end: column.text,         // DATE as 'YYYY-MM-DD' string
  allocated_amount: column.text,   // TEXT to preserve decimal precision
  allocated_units: column.text,    // 'AF' | 'GAL' | 'CF'
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});
```

### Schema Registration

```typescript
export const AppSchema = new Schema({
  farms,
  users,
  farm_members,
  farm_invites,
  wells,
  readings,       // NEW
  allocations,    // NEW
});

export type Reading = Database['readings'];
export type Allocation = Database['allocations'];
```

### Connector Updates

```typescript
// ALLOWED_TABLES
const ALLOWED_TABLES = new Set([
  'farms', 'users', 'farm_members', 'farm_invites', 'wells',
  'readings',      // NEW
  'allocations',   // NEW
]);

// normalizeForSupabase()
if (table === 'readings' && 'gps_verified' in data) {
  return { ...data, gps_verified: Boolean(data.gps_verified) };
}
```

---

## Routing Changes

Add inside the `AppLayout` route group in `App.tsx`:

```typescript
<Route path="/wells/:wellId" element={<WellDetailPage />} />
<Route path="/wells/:wellId/readings/new" element={<RecordReadingPage />} />
```

**Permission gating:** All farm members can view `/wells/:id`. The "Record Reading" button on WellDetailPage is gated by `hasPermission(role, 'record_reading')`. "Edit Well" is gated by `hasPermission(role, 'manage_wells')`. "Manage Allocations" is gated by `hasPermission(role, 'manage_allocations')`.

---

## Patterns to Follow

### Pattern 1: Hook Composition for Complex Pages

**What:** WellDetailPage composes multiple independent hooks instead of one monolithic query.
**When:** Any page that displays data from multiple tables.
**Example:**

```typescript
function WellDetailPage() {
  const { wellId } = useParams();
  const { well, loading: wellLoading } = useWell(wellId);
  const { readings, loading: readingsLoading } = useReadings(wellId, { limit: 20 });
  const { currentAllocation } = useAllocations(wellId);
  const role = useUserRole();
  // Compose UI from independent data sources
}
```

**Why:** Each hook manages its own reactive subscription. When a new reading is added, only `useReadings` consumers re-render, not the entire page.

### Pattern 2: Bottom Sheet for Forms (Existing Pattern)

**What:** Use Headless UI `Dialog` with `data-[closed]:translate-y-full` transition for all new forms.
**When:** Any form that overlays the current view.
**Example:** See `AddWellFormBottomSheet.tsx` for the established pattern.
**Apply to:** WellEditBottomSheet, AllocationForm.

### Pattern 3: TEXT Storage with Client-Side Parsing for Decimals

**What:** Store decimal values as `column.text` in PowerSync. Parse to `Number` only for calculations. Display with `toFixed(2)`.
**When:** Any value that is `NUMERIC` in PostgreSQL (meter_value, allocated_amount).
**Example:**

```typescript
// Reading from PowerSync (TEXT)
const rawValue = reading.meter_value; // "12345.67" (string)

// Calculation
const currentValue = parseFloat(rawValue);
const previousValue = parseFloat(previousReading.meter_value);
const usage = (currentValue - previousValue) * multiplierFactor;

// Display
<span>{usage.toFixed(2)} {well.units}</span>
```

### Pattern 4: GPS as Advisory, Not Required

**What:** GPS capture is attempted but never blocks the user from saving.
**When:** Recording a meter reading.
**Example:**

```typescript
const handleSave = useCallback(() => {
  const readingData = {
    meter_value: meterValue,
    gps_latitude: userLocation?.lat ?? null,     // null if GPS unavailable
    gps_longitude: userLocation?.lng ?? null,
    gps_accuracy: gpsAccuracy ?? null,
    gps_verified: isWithinRange ? 1 : 0,         // false if GPS unavailable
    // ...
  };
  db.execute('INSERT INTO readings ...', [/* ... */]);
}, [/* deps */]);
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side GPS Verification

**What:** Verifying GPS proximity on Supabase (e.g., in RLS policies or triggers).
**Why bad:** User may be offline when recording. GPS check must complete before save. Supabase only processes data on sync, which could be hours later.
**Instead:** Compute GPS proximity entirely client-side. Store `gps_verified` boolean. Server trusts client value. Add server-side PostGIS audit check later if needed (supplementary, not blocking).

### Anti-Pattern 2: Using column.real for Meter Values

**What:** Defining `meter_value` as `column.real` in PowerSync schema.
**Why bad:** SQLite REAL is IEEE 754 float. A value like `12345.67` may become `12345.670000000001`. Corrupts usage calculations and display.
**Instead:** Use `column.text`. Parse to `Number` only for calculations. Display with `toFixed(2)`.

### Anti-Pattern 3: Querying All Readings for All Wells

**What:** `SELECT * FROM readings WHERE well_id IN (SELECT id FROM wells WHERE farm_id = ?)` at the client.
**Why bad:** Queries ALL readings for ALL farm wells. Slow with 50+ wells and months of data.
**Instead:** Always query by specific `well_id`. The sync layer handles farm-level scoping.

### Anti-Pattern 4: Using Zustand for Reading/Allocation Data

**What:** Putting server-synced data into Zustand stores.
**Why bad:** PowerSync IS the state manager for synced data. Duplicating in Zustand creates sync conflicts, stale data, double maintenance.
**Instead:** Use `useQuery()` for all reading/allocation data. Zustand only for UI state (which sheet is open, form dirty state).

### Anti-Pattern 5: Applying Multiplier Inconsistently

**What:** Applying the meter multiplier to one reading but not another, or applying it to both individual readings AND the delta.
**Why bad:** Usage off by orders of magnitude. A 10x multiplier error means a farm appears to have used 10x its allocation.
**Instead:** Formula: `usage = (current_raw - previous_raw) * multiplier_factor`. Apply once to the delta. Document clearly.

---

## Scalability Considerations

| Concern | At 100 readings/well | At 1K readings/well | At 10K readings/well |
|---------|---------------------|---------------------|----------------------|
| Query performance | Trivial. SQLite handles instantly. | LIMIT to 50 default (already planned). | Date-range filtering. Virtual scrolling. |
| Sync payload | ~10KB per well. Negligible. | ~100KB per well. Fine for WebSocket. | ~1MB per well. Consider date windowing in sync rules (last 2 years). |
| Allocation calc | Fetch year readings, compute delta. Instant. | Same. Still fast with indexed query. | Pre-compute on server if needed. Client-side still viable. |
| Local DB size | Under 1MB. No concern. | 5-10MB. Fine for modern devices. | 50-100MB. May need to limit sync window or purge old data. |

---

## Sources

- Existing codebase analysis: `powersync-schema.ts`, `powersync-connector.ts`, `useWells.ts`, `useGeolocation.ts`, `AddWellFormBottomSheet.tsx`, `WellMarker.tsx`, `validation.ts`, `UserLocationCircle.tsx` -- HIGH confidence, direct code review
- Migration 013 (`013_drop_wells_tables.sql`): Confirms readings and allocations tables were dropped -- HIGH confidence
- Migration 017 (`017_create_wells_table.sql`): Confirms only wells was recreated -- HIGH confidence
- API.md: Original schema design for readings and allocations -- HIGH confidence (design reference, not current state)
- SQLite floating-point docs: [sqlite.org/floatingpoint.html](https://sqlite.org/floatingpoint.html) -- HIGH confidence
- @turf/distance: [turfjs.org/docs/api/distance](https://turfjs.org/docs/api/distance) -- HIGH confidence
- MDN Geolocation API: [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API/Using_the_Geolocation_API) -- HIGH confidence
- Water conversion factors: [Oklahoma State University Extension](https://extension.okstate.edu/fact-sheets/water-measurement-units-and-conversion-factors.html), [California Water Boards](https://www.waterboards.ca.gov/waterrights/water_issues/programs/measurement_regulation/docs/water_measurement/units.pdf) -- HIGH confidence

---
*Architecture research for: Meter readings, allocations, GPS proximity, well detail, well edit, problem reporting*
*Researched: 2026-02-19*
