# Technology Stack

**Project:** AG Water Tracker -- Meter Readings, Allocations, GPS Proximity & Well Management
**Researched:** 2026-02-19
**Overall confidence:** HIGH

## Context: Existing Stack (Do Not Change)

These technologies are already in production and are NOT part of this research. Listed for compatibility reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| Vite | ^6.4.1 | Build tool |
| TypeScript | ~5.9.3 | Type safety |
| Tailwind CSS | ^4.1.18 | Styling (CSS-first config) |
| @powersync/web | ^1.32.0 | Offline-first SQLite sync |
| @powersync/react | ^1.8.2 | React bindings for PowerSync |
| @supabase/supabase-js | ^2.93.3 | Supabase client |
| Mapbox GL JS | ^3.18.1 | Maps |
| react-map-gl | ^8.1.0 | React Mapbox wrapper |
| @turf/circle | ^7.3.3 | Circle polygon generation for map |
| Headless UI | ^2.2.9 | Accessible UI primitives |
| Heroicons | ^2.2.0 | Icons |
| React Router | ^7.13.0 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |
| Zustand | ^5.0.11 | UI state |
| react-error-boundary | ^6.1.0 | Error boundaries |

---

## Recommended Stack (New Additions for This Milestone)

### 1. GPS Distance Calculation: @turf/distance

**Confidence:** HIGH -- same ecosystem as existing @turf/circle dependency.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @turf/distance | ^7.3.3 | Haversine distance between user GPS and well coordinates | Uses the same Turf.js v7 ecosystem already in the project (@turf/circle is v7.3.3). Calculates great-circle distance using the Haversine formula. Returns distance in configurable units (meters, kilometers, miles). Tree-shakeable -- only adds ~3KB. |

**Why @turf/distance over alternatives:**

| Option | Verdict | Reason |
|--------|---------|--------|
| @turf/distance | USE THIS | Same ecosystem as @turf/circle (already installed). Consistent API (GeoJSON points, configurable units). Well-maintained (7.3.3, same release as @turf/circle). Haversine formula is accurate to ~0.3% for Earth-surface distances. |
| Custom Haversine function (~15 lines) | Viable but unnecessary | The formula is simple, but @turf/distance handles edge cases, unit conversion, and GeoJSON interop that would need to be reimplemented. Since @turf/helpers is already a transitive dependency, the marginal bundle cost is near zero. |
| haversine-distance npm | Skip | Adds a separate dependency tree for something @turf already provides. Would be the only non-Turf geo package in the project. |

**Usage pattern for GPS proximity verification:**

```typescript
import { distance, point } from '@turf/turf';
// Or tree-shaken:
import distance from '@turf/distance';
import { point } from '@turf/helpers';

const PROXIMITY_THRESHOLD_KM = 0.1; // 100 meters

function isWithinRange(
  userLat: number, userLng: number,
  wellLat: number, wellLng: number,
  thresholdKm = PROXIMITY_THRESHOLD_KM
): { inRange: boolean; distanceMeters: number } {
  const userPoint = point([userLng, userLat]);
  const wellPoint = point([wellLng, wellLat]);
  const dist = distance(userPoint, wellPoint, { units: 'kilometers' });
  return {
    inRange: dist <= thresholdKm,
    distanceMeters: Math.round(dist * 1000),
  };
}
```

**Note:** @turf/helpers is already a transitive dependency of @turf/circle. The `point()` helper is available without additional install.

---

### 2. Date/Time Input: Native HTML5 `<input type="date">` and `<input type="datetime-local">`

**Confidence:** HIGH -- no library needed.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `<input type="date">` | HTML5 (all modern browsers) | Date selection for reading date, allocation periods | Zero bundle cost. Mobile browsers (iOS Safari, Chrome, Firefox) all provide native date picker widgets with OS-native UX. This is a field-worker app primarily used on mobile -- native pickers are the best UX. |
| Native `<input type="datetime-local">` | HTML5 | Date+time for meter reading timestamps | Same rationale. Provides time selection on mobile without a library. |

**Why NOT a date picker library:**

| Option | Verdict | Reason |
|--------|---------|--------|
| Native HTML5 inputs | USE THIS | Zero bundle cost. Mobile-native UX (iOS/Android pickers). Field workers use phones, not desktops. No library to maintain. |
| react-datepicker | Skip | 44KB gzipped. Adds CSS dependency. Mobile UX is worse than native OS picker. Overkill for "pick a date" in a mobile-first PWA. |
| react-day-picker | Skip | Better than react-datepicker but still unnecessary overhead for this use case. Would only consider if custom calendar UI were needed (e.g., color-coding dates with readings). |

**Implementation pattern:**

```tsx
<input
  type="date"
  value={readingDate}  // "YYYY-MM-DD" format
  max={new Date().toISOString().split('T')[0]}  // no future dates
  onChange={(e) => setReadingDate(e.target.value)}
  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
/>
```

**Caveat:** On older desktop Firefox (pre-93), `<input type="date">` renders as a plain text field without a calendar picker. This is acceptable because this app targets mobile field workers. Desktop is secondary.

---

### 3. Numeric Precision Strategy: PowerSync column.text for Meter Values

**Confidence:** HIGH -- based on SQLite documentation and existing project patterns.

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Meter reading values (e.g., 12345678.90) | Store as `column.text` in PowerSync schema | SQLite REAL is IEEE 754 double (64-bit float) which introduces rounding for decimals. Meter values like `12345.67` can silently become `12345.670000000001`. Storing as TEXT preserves exact decimal representation. Parse to number only for calculations. |
| Allocation amounts (e.g., 150.50 AF) | Store as `column.text` in PowerSync schema | Same rationale. Allocation amounts are financial-grade precision. PostgreSQL uses `numeric(10,2)` which is exact decimal -- TEXT preserves this across the sync boundary. |
| GPS coordinates (lat/lng) | Keep as `column.real` in PowerSync schema | Already using `column.real` for well lat/lng. GPS coordinates from the Geolocation API are already floating-point. Rounding at the 8th decimal place (sub-millimeter) is irrelevant for 100m proximity checks. |
| Calculated usage values | Compute client-side, do not store | Usage = (current_reading - previous_reading) * multiplier. Calculated on display, not persisted. Avoids sync conflicts and stale derived data. |

**Critical: The PostgreSQL-to-SQLite precision boundary.**

PostgreSQL `numeric(15,2)` stores exact decimals. When PowerSync syncs this to SQLite:
- If the PowerSync schema column is `column.real`: SQLite stores it as a float, potentially losing precision.
- If the PowerSync schema column is `column.text`: SQLite stores the exact decimal string. Parse to `Number()` or `parseFloat()` only when calculating.

The existing `wells` table already uses `column.text` for `multiplier` (which includes values like `'0.01'`). This milestone should follow the same pattern for meter values and allocation amounts.

**Meter value calculation formula:**

```typescript
// Usage between two readings:
// actual_usage = (current_raw - previous_raw) * multiplier_factor

// Where multiplier_factor depends on well.multiplier:
const MULTIPLIER_MAP: Record<string, number> = {
  '0.01': 0.01,
  '1': 1,
  '10': 10,
  '1000': 1000,
  'MG': 1_000_000, // Million Gallons -- raw reading is in MG units
};
```

---

### 4. Unit Conversion Constants

**Confidence:** HIGH -- well-established water measurement standards.

No library needed. These are fixed conversion factors from authoritative water management sources (Oklahoma State University Extension, California Water Boards, Colorado River District).

| Conversion | Factor | Precision Notes |
|------------|--------|-----------------|
| 1 Acre-Foot (AF) to Gallons (GAL) | 325,851 gallons | Exact per US survey standards. Some sources round to 325,829 or 326,000 -- use 325,851 for consistency with USGS. |
| 1 Acre-Foot (AF) to Cubic Feet (CF) | 43,560 cubic feet | Exact (1 acre = 43,560 sq ft, 1 AF = 1 ft depth). |
| 1 Cubic Foot (CF) to Gallons (GAL) | 7.48052 gallons | Standard precision. 325,851 / 43,560 = 7.48052. |

**Implementation: Pure TypeScript utility module, no external library.**

```typescript
// src/lib/unitConversions.ts
const AF_TO_GAL = 325_851;
const AF_TO_CF = 43_560;
const CF_TO_GAL = 7.48052;

type WaterUnit = 'AF' | 'GAL' | 'CF';

export function convertUnits(
  value: number,
  from: WaterUnit,
  to: WaterUnit
): number {
  if (from === to) return value;
  // Convert to AF first, then to target
  const inAF = from === 'AF' ? value
    : from === 'GAL' ? value / AF_TO_GAL
    : value / AF_TO_CF; // CF
  return to === 'AF' ? inAF
    : to === 'GAL' ? inAF * AF_TO_GAL
    : inAF * AF_TO_CF; // CF
}
```

---

### 5. PowerSync Schema Additions: readings and allocations tables

**Confidence:** HIGH -- follows existing patterns in `powersync-schema.ts`.

No new npm packages needed. The PowerSync schema must be extended with two new `TableV2` definitions.

| Table | PowerSync Columns | Type Notes |
|-------|-------------------|------------|
| `readings` | `well_id: text`, `meter_value: text`, `reading_date: text`, `gps_latitude: real`, `gps_longitude: real`, `gps_accuracy: real`, `gps_verified: integer`, `notes: text`, `problem_type: text`, `problem_notes: text`, `created_by: text`, `created_at: text`, `updated_at: text` | `meter_value` as TEXT to preserve decimal precision. `gps_verified` as INTEGER (0/1) following existing boolean pattern. `gps_latitude`/`gps_longitude` as REAL (same as wells). |
| `allocations` | `well_id: text`, `period_start: text`, `period_end: text`, `allocated_amount: text`, `allocated_units: text`, `notes: text`, `created_at: text`, `updated_at: text` | `allocated_amount` as TEXT to preserve decimal precision. Period-based (start/end dates) instead of year-only for flexibility. |

**Key pattern from existing codebase:** PowerSync does not support BOOLEAN type. Use INTEGER (0/1) and convert in the connector's `normalizeForSupabase()` method. The existing connector already does this for `wells.send_monthly_report`.

**Connector update needed:** Add `'readings'` and `'allocations'` to `ALLOWED_TABLES` in `powersync-connector.ts`. Add boolean normalization for `readings.gps_verified`.

---

### 6. Geolocation API: watchPosition for GPS Proximity

**Confidence:** HIGH -- Web standard API, already used in the project.

No new library needed. The existing `useGeolocation` hook uses `getCurrentPosition()`. For the meter reading flow, we need a new hook variant that uses `watchPosition()` for continuous GPS tracking while the reading form is open.

| Approach | Use Case | Why |
|----------|----------|-----|
| `getCurrentPosition()` (existing hook) | One-shot location for well creation | Already implemented in `useGeolocation.ts`. Good for "get my location" button. |
| `watchPosition()` (new hook) | Continuous GPS during meter reading | Field worker approaches well, opens reading form. GPS updates continuously so proximity status reflects real-time position. Auto-stops when form closes (cleanup in useEffect). |

**Battery/performance concern:** `watchPosition` drains battery if left running. Mitigation: only activate when the reading form is open, and clear the watch on form close/unmount. The existing hook pattern with `requestIdRef` for StrictMode handling is the right foundation.

**Accuracy field:** The Geolocation API returns `coords.accuracy` (meters). Store this alongside the reading's GPS coordinates for auditability. A reading with 500m accuracy is less trustworthy than one with 5m accuracy.

---

### 7. Well Editing: No New Libraries

**Confidence:** HIGH -- reuses existing form patterns.

The existing `AddWellFormBottomSheet` uses Headless UI `Dialog` with controlled state and `SegmentedControl` for units/multiplier. Well editing reuses the same components with pre-populated values.

**Pattern:** Extract the shared form fields into a `WellFormFields` component. `AddWellFormBottomSheet` and `EditWellFormBottomSheet` (or a unified `WellFormBottomSheet` with `mode: 'create' | 'edit'`) both compose this.

No new UI libraries needed. All form patterns (text inputs, select dropdowns, segmented controls, GPS button) are already implemented.

---

### 8. Meter Problem Reporting: No New Libraries

**Confidence:** HIGH -- uses existing UI patterns.

Problem reporting is a set of structured fields (problem type enum, notes text area, optional photo reference) within the reading form. Uses existing Headless UI components and Tailwind styling.

| Field | Type | Values |
|-------|------|--------|
| `problem_type` | Enum (select) | `none`, `broken_meter`, `damaged_seal`, `no_access`, `frozen`, `vandalism`, `other` |
| `problem_notes` | Text (textarea) | Free-text description |

No image upload in initial implementation. Photo support would require Supabase Storage integration (a future milestone concern).

---

## Recommended Stack Summary

### New Dependencies (npm install)

```bash
# GPS distance calculation (same ecosystem as existing @turf/circle)
npm install @turf/distance
```

**That is the ONLY new npm package.** Everything else uses existing dependencies, native browser APIs, or custom utility code.

### No New Dependencies Needed For

| Feature | Why No Library |
|---------|----------------|
| Date/time picking | Native HTML5 `<input type="date">` and `<input type="datetime-local">` -- mobile-native UX, zero bundle cost |
| Unit conversion (AF/GAL/CF) | ~20 lines of TypeScript with well-established conversion constants |
| Numeric precision | Store as `column.text` in PowerSync, parse on calculation. No `decimal.js` or `bignumber.js` needed -- meter values have max 2 decimal places and calculations are simple subtraction/multiplication |
| GPS proximity check | @turf/distance (listed above) + existing Geolocation API hook pattern |
| Well editing form | Existing Headless UI Dialog + form patterns |
| Meter problem reporting | Existing select/textarea patterns |
| Reading history list | Existing PowerSync `useQuery` + `useMemo` patterns |
| Allocation CRUD | Existing PowerSync write + form patterns |

---

## Database Changes (Supabase Migrations)

No new npm packages, but new PostgreSQL migrations are needed.

### New Table: `readings`

```sql
CREATE TABLE readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    meter_value NUMERIC(15,2) NOT NULL,
    reading_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gps_latitude NUMERIC(10,8),
    gps_longitude NUMERIC(11,8),
    gps_accuracy NUMERIC(8,2),           -- NEW: accuracy in meters from Geolocation API
    gps_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    problem_type TEXT DEFAULT 'none',     -- NEW: meter problem enum
    problem_notes TEXT,                   -- NEW: problem description
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### New Table: `allocations`

```sql
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,           -- CHANGED: date instead of year integer
    period_end DATE NOT NULL,             -- CHANGED: end date for flexibility
    allocated_amount NUMERIC(10,2) NOT NULL CHECK (allocated_amount > 0),
    allocated_units TEXT NOT NULL DEFAULT 'AF' CHECK (allocated_units IN ('AF', 'GAL', 'CF')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(well_id, period_start, period_end)
);
```

**Key change from original API.md spec:** Allocations use `period_start`/`period_end` dates instead of just `year` integer. This supports:
- Annual allocations (Jan 1 - Dec 31)
- Irrigation season allocations (Apr 1 - Oct 31)
- Custom periods as required by water districts

---

## Connector Updates Required

The existing `SupabaseConnector` in `powersync-connector.ts` needs:

1. Add `'readings'` and `'allocations'` to `ALLOWED_TABLES`
2. Add boolean normalization for `readings.gps_verified` in `normalizeForSupabase()`
3. No other connector changes needed -- the existing PUT/PATCH/DELETE flow handles all table operations generically

---

## Sync Rules Updates Required (PowerSync Dashboard)

New sync rule data queries for the `user_farm_data` bucket:

```yaml
# Sync all readings for farm wells
- SELECT r.* FROM readings r
  WHERE r.well_id IN (
    SELECT id FROM wells WHERE farm_id IN (
      SELECT farm_id FROM users WHERE id = bucket.user_id
    )
  )

# Sync all allocations for farm wells
- SELECT a.* FROM allocations a
  WHERE a.well_id IN (
    SELECT id FROM wells WHERE farm_id IN (
      SELECT farm_id FROM users WHERE id = bucket.user_id
    )
  )
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| GPS distance | @turf/distance | Custom Haversine function | @turf is already in the project. Consistent API, tested edge cases, unit conversion included. Marginal bundle cost. |
| GPS distance | @turf/distance | geolib npm package | Different ecosystem. @turf is already a dependency. geolib would add a parallel geo library. |
| Date picker | Native HTML5 input | react-datepicker | 44KB gzipped overhead for a mobile-first app where native pickers are better UX. |
| Date picker | Native HTML5 input | react-day-picker | Unnecessary for "pick a date" flows. Would consider only if calendar visualization were needed. |
| Decimal precision | TEXT storage + parseFloat | decimal.js or bignumber.js | Meter values have max 2 decimal places. Calculations are simple (subtraction, multiplication). Arbitrary-precision libraries add 15-30KB for a problem that does not exist in this domain. |
| Allocation model | Period-based (start/end) | Year-only (integer) | Water districts often use irrigation seasons, not calendar years. Period-based is more flexible with minimal added complexity. |
| Form state | React useState (existing pattern) | React Hook Form or Formik | Existing forms use plain useState. Forms are simple (5-10 fields). A form library adds complexity without benefit at this scale. |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| decimal.js / bignumber.js | Meter values are NUMERIC(15,2) -- at most 2 decimal places. Simple JS number arithmetic with `toFixed(2)` is sufficient. These libraries are for arbitrary-precision math (financial, cryptographic). | Store as TEXT in PowerSync, parse with `parseFloat()`, round with `toFixed(2)` for display. |
| react-datepicker / date-fns | This is a mobile-first PWA. Native date inputs provide OS-native picker UX. Adding a date library means shipping CSS + JS that provides worse mobile UX than the browser default. | Native `<input type="date">` and `<input type="datetime-local">`. |
| Chart.js / recharts / d3 | Not needed for this milestone. Reading history is a list, not a chart. Allocation gauge is a custom SVG component, not a charting library use case. | Custom SVG gauge component (existing pattern in codebase design). |
| Leaflet / alternative map library | Already using Mapbox GL JS via react-map-gl. No reason to add a second map library for proximity visualization. | Use existing Mapbox + @turf/circle for proximity circles on map. |
| PostGIS geography type for wells | Migration 017 deliberately moved away from PostGIS to simple lat/lng NUMERIC columns. The distance calculation happens client-side via @turf/distance, not via PostGIS ST_DWithin. | Client-side Haversine via @turf/distance. PostGIS would only matter for server-side spatial queries, which this offline-first architecture does not use. |
| Image upload library (for problem photos) | Problem reporting in this milestone is text-only (type enum + notes). Photo attachment is a future feature that requires Supabase Storage setup. Do not add complexity prematurely. | Text-based problem reporting. Flag photo support as a future enhancement. |
| @stripe/stripe-js | Billing is a separate milestone (already researched in prior STACK.md). Do not mix billing concerns into the readings/allocations feature set. | Defer to billing milestone. |

---

## Installation

```bash
# The ONLY new dependency for this milestone:
npm install @turf/distance

# No dev dependencies needed
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| @turf/distance ^7.3.3 | @turf/circle ^7.3.3 | Same Turf.js v7 release. Shared dependency on @turf/helpers ^7.3.3 (already installed as transitive dep of @turf/circle). |
| @turf/distance ^7.3.3 | @powersync/web ^1.32.0 | No interaction. @turf is client-side geo math. PowerSync is sync engine. |
| Native HTML5 date inputs | React ^19.2.0 | Standard HTML elements. React controlled inputs work with `value` and `onChange` as with any input. |
| column.text (PowerSync schema) | @powersync/web ^1.32.0 | TEXT is a supported PowerSync column type. Values sync as strings. Parse client-side. |

---

## Sources

- [@turf/distance npm](https://www.npmjs.com/package/@turf/distance) -- HIGH confidence, v7.3.3 (matches project's @turf/circle version)
- [Turf.js distance documentation](https://turfjs.org/docs/api/distance) -- HIGH confidence, official docs
- [Haversine formula reference](https://www.movable-type.co.uk/scripts/latlong.html) -- HIGH confidence, definitive reference for GPS distance calculation
- [SQLite Datatypes documentation](https://www.sqlite.org/datatype3.html) -- HIGH confidence, official SQLite docs (REAL precision limitations)
- [SQLite Floating Point documentation](https://sqlite.org/floatingpoint.html) -- HIGH confidence, official (confirms IEEE 754 limitations for decimal storage)
- [MDN: input type="date"](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date) -- HIGH confidence, official web standards reference
- [MDN: Geolocation watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition) -- HIGH confidence, official web API docs
- [Water Measurement Units and Conversion Factors (Oklahoma State University)](https://extension.okstate.edu/fact-sheets/water-measurement-units-and-conversion-factors.html) -- HIGH confidence, academic/government source
- [Unit Conversions (California Water Boards)](https://www.waterboards.ca.gov/waterrights/water_issues/programs/measurement_regulation/docs/water_measurement/units.pdf) -- HIGH confidence, government source
- [Water Measurement Basics (Colorado River District)](https://www.coloradoriverdistrict.org/water-measurement/) -- HIGH confidence, authoritative water management source
- [PowerSync JavaScript Web SDK docs](https://docs.powersync.com/client-sdks/reference/javascript-web) -- HIGH confidence, official docs (column types: text, integer, real)
- [Can I use: input type=date](https://caniuse.com/input-datetime) -- HIGH confidence, browser compatibility data

---
*Stack research for: AG Water Tracker -- Meter Readings, GPS Proximity, Allocations, Well Management*
*Researched: 2026-02-19*
