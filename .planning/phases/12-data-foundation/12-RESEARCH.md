# Phase 12: Data Foundation - Research

**Researched:** 2026-02-19
**Domain:** Database tables, PowerSync sync, query hooks, GPS proximity utility
**Confidence:** HIGH

## Summary

Phase 12 is pure infrastructure: two new Supabase tables (`readings`, `allocations`), their PowerSync schema and sync rules, connector updates for uploading offline-created records, two query hooks (`useWellReadings`, `useWellAllocations`), and a GPS proximity utility (`getDistanceToWell`, `isInRange`). No UI components are built in this phase.

The project has strong precedent for every pattern needed. The wells table (migration 017) and `useWells` hook establish the exact patterns for schema, RLS, PowerSync config, and hook design. The existing `@turf/circle` v7.3.3 dependency means `@turf/distance` (same version family) can be added with minimal risk. The RLS policies for allocations and readings were already designed in migration 011 (though the tables were dropped in migration 013 and only wells was recreated in 017) -- those policies provide a reliable template.

**Primary recommendation:** Follow existing patterns exactly. The new tables, hooks, and utilities are straightforward extensions of established conventions. The main complexity is ensuring the PowerSync sync rules, connector, and type normalization are correct for the new tables.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- GPS proximity threshold: 500 feet (~150 meters), global constant for all wells
- Not configurable per-well -- single constant, can add per-well override in a future phase
- Distance utility returns values in feet (natural for US agricultural users)
- User sees status only: "In Range" or "Out of Range" -- no exact distance displayed
- `is_in_range` boolean stored with each reading is computed at recording time based on this threshold

### Claude's Discretion
- Exact table column types and constraints for readings/allocations (guided by roadmap success criteria + v2.0 decisions)
- RLS policy design for readings and allocations tables
- PowerSync sync rule configuration
- Whether to add well equipment status columns (pump_state, battery_state, meter_status) in this migration or defer to Phase 14
- Allocation period overlap/gap rules (technical constraint design)
- Reading value storage format in Supabase (TEXT vs NUMERIC -- PowerSync side already decided as TEXT)
- @turf/distance implementation details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @turf/distance | ^7.3.3 | Haversine distance between GPS coordinates | Industry-standard geospatial library, already using @turf/circle v7.3.3 |
| @powersync/web | ^1.32.0 | Local-first database with sync | Already in project, TableV2 schema for new tables |
| @powersync/react | ^1.8.2 | React hooks for PowerSync queries | Already in project, useQuery for new hooks |
| @supabase/supabase-js | ^2.93.3 | Backend API client | Already in project, connector uses for CRUD upload |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @turf/helpers | (transitive) | GeoJSON point creation, unit types | Imported by @turf/distance, used for `point()` function and `Units` type |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @turf/distance | Manual Haversine formula | Turf handles edge cases (poles, date line), well-tested, consistent with existing @turf/circle usage |
| @turf/distance | geolib | Extra dependency; Turf already in project via @turf/circle |

**Installation:**
```bash
npm install @turf/distance
```

Note: `@turf/helpers` is a transitive dependency of both `@turf/distance` and the already-installed `@turf/circle`. No separate install needed.

## Architecture Patterns

### Recommended Project Structure
```
src/
  hooks/
    useWellReadings.ts      # Query hook for readings
    useWellAllocations.ts   # Query hook for allocations
  lib/
    powersync-schema.ts     # Add readings + allocations tables (existing file)
    powersync-connector.ts  # Add to ALLOWED_TABLES + normalizeForSupabase (existing file)
    gps-proximity.ts        # getDistanceToWell, isInRange, PROXIMITY_THRESHOLD_FEET
supabase/
  migrations/
    031_create_readings_and_allocations.sql  # New migration
docs/
  powersync-sync-rules.yaml  # Update with readings + allocations buckets (existing file)
```

### Pattern 1: PowerSync Schema Definition (Established Pattern)
**What:** Define new tables using TableV2 with column types (text, integer, real)
**When to use:** Adding any new synced table
**Example:**
```typescript
// Source: existing powersync-schema.ts pattern
const readings = new TableV2({
  well_id: column.text,
  value: column.text,        // TEXT to preserve decimal precision (v2.0 decision)
  recorded_by: column.text,
  recorded_at: column.text,
  gps_latitude: column.real,
  gps_longitude: column.real,
  is_in_range: column.integer, // PowerSync doesn't support BOOLEAN
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});
```

**Key points:**
- PowerSync only supports `text`, `integer`, and `real` column types
- No BOOLEAN type -- use `integer` (0/1) and convert in connector + hooks
- Meter value stored as `text` in PowerSync to preserve decimal precision (v2.0 decision)
- `id` column is auto-created by PowerSync SDK (text type, UUID)

### Pattern 2: Query Hook with Memoization (Established Pattern)
**What:** PowerSync query hook with farmId/wellId guard, typed rows, and memoized mapping
**When to use:** Any data retrieval hook
**Example:**
```typescript
// Source: existing useWells.ts pattern
export function useWellReadings(wellId: string | null) {
  const query = wellId
    ? `SELECT id, well_id, value, recorded_by, recorded_at, gps_latitude,
       gps_longitude, is_in_range, notes, created_at, updated_at
       FROM readings WHERE well_id = ? ORDER BY recorded_at DESC`
    : 'SELECT NULL WHERE 0';

  const { data, isLoading, error } = useQuery<ReadingRow>(query, wellId ? [wellId] : []);

  const readings = useMemo<Reading[]>(
    () => (data ?? []).map((row) => ({
      id: row.id,
      wellId: row.well_id,
      value: row.value,
      recordedBy: row.recorded_by,
      recordedAt: row.recorded_at,
      gpsLatitude: row.gps_latitude,
      gpsLongitude: row.gps_longitude,
      isInRange: row.is_in_range === 1,  // Convert INTEGER to boolean
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    [data],
  );

  return { readings, loading: isLoading, error };
}
```

### Pattern 3: Connector ALLOWED_TABLES + Type Normalization (Established Pattern)
**What:** Add new tables to the connector's ALLOWED_TABLES set and handle type conversion
**When to use:** Any new table that can be written offline
**Example:**
```typescript
// Source: existing powersync-connector.ts pattern
const ALLOWED_TABLES = new Set([
  'farms', 'users', 'farm_members', 'farm_invites', 'wells',
  'readings', 'allocations',  // NEW
]);

// In normalizeForSupabase():
if (table === 'readings' && 'is_in_range' in data) {
  return { ...data, is_in_range: Boolean(data.is_in_range) };
}
if (table === 'allocations' && 'is_manual_override' in data) {
  return { ...data, is_manual_override: Boolean(data.is_manual_override) };
}
```

### Pattern 4: GPS Proximity Utility (New)
**What:** Pure utility functions for distance calculation and range checking
**When to use:** Recording readings (compute is_in_range), displaying proximity status
**Example:**
```typescript
// New file: src/lib/gps-proximity.ts
import { distance } from '@turf/distance';

/** 500 feet = ~152.4 meters */
export const PROXIMITY_THRESHOLD_FEET = 500;

export function getDistanceToWell(
  userCoords: { lat: number; lng: number },
  wellCoords: { latitude: number; longitude: number },
): number {
  // @turf/distance accepts Coord type (Position = [lng, lat])
  const distanceInFeet = distance(
    [userCoords.lng, userCoords.lat],
    [wellCoords.longitude, wellCoords.latitude],
    { units: 'feet' },
  );
  return distanceInFeet;
}

export function isInRange(distanceFeet: number): boolean {
  return distanceFeet <= PROXIMITY_THRESHOLD_FEET;
}
```

### Pattern 5: PowerSync Sync Rules for Child Tables (Established Pattern)
**What:** Sync rules that use farm_id parameter to filter child tables via well_id
**When to use:** Syncing readings and allocations that belong to wells in the user's farm
**Example:**
```yaml
# Source: existing farm_wells pattern + PowerSync data query docs
# Readings and allocations need well_id-based sync through the wells table.
# PowerSync data queries support subqueries in WHERE clauses.
farm_readings:
  parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()
  data:
    - SELECT id, well_id, value, recorded_by, recorded_at, gps_latitude, gps_longitude, is_in_range, notes, created_at, updated_at FROM readings WHERE well_id IN (SELECT id FROM wells WHERE farm_id = bucket.farm_id)

farm_allocations:
  parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()
  data:
    - SELECT id, well_id, period_start, period_end, allocated_af, used_af, is_manual_override, notes, created_at, updated_at FROM allocations WHERE well_id IN (SELECT id FROM wells WHERE farm_id = bucket.farm_id)
```

**Important note on sync rules:** The existing sync rules documentation (powersync-sync-rules.yaml) says "actual rules are configured on PowerSync dashboard." PowerSync data queries do support `IN (SELECT ...)` subqueries (verified: the RLS policies in migration 011 use this exact pattern for allocations and readings, and the PowerSync docs show parent-child syncing via bucket parameters). However, a simpler alternative is to add `well_id` directly to the existing `farm_wells` bucket since it already has `farm_id` as a parameter.

### Anti-Patterns to Avoid
- **Storing meter values as REAL in PowerSync:** Decision is TEXT to preserve decimal precision. Floating-point rounding would corrupt meter readings.
- **Using empty string for guard queries:** Always use `'SELECT NULL WHERE 0'` (established project convention).
- **Creating boolean columns in PowerSync schema:** Use `column.integer` and convert in connector/hooks (PowerSync limitation).
- **Forgetting to memoize mapped query results:** Always wrap in `useMemo(() => ..., [data])`.
- **Omitting tables from ALLOWED_TABLES in connector:** PowerSync will silently skip CRUD operations for unlisted tables.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Haversine distance | Custom math formula | `@turf/distance` | Handles edge cases (poles, antimeridian), well-tested, same family as existing `@turf/circle` |
| Unit conversion (meters/feet) | Manual conversion factors | `@turf/distance` with `{ units: 'feet' }` option | Turf supports feet natively, no error-prone conversion needed |
| GeoJSON point creation | Manual `{ type: 'Feature', geometry: ... }` | Pass raw `[lng, lat]` to `@turf/distance` | Turf accepts `Position` arrays directly as `Coord` type |
| Boolean normalization | Per-field if/else chains | Extend existing `normalizeForSupabase` method | Pattern already established, keeps conversion logic centralized |

**Key insight:** Every piece of this phase has a direct precedent in the existing codebase. The risk comes from deviation, not from the patterns themselves.

## Common Pitfalls

### Pitfall 1: PowerSync BOOLEAN Type Missing
**What goes wrong:** Defining `column.boolean` in schema causes runtime error
**Why it happens:** PowerSync SQLite only supports TEXT, INTEGER, and REAL
**How to avoid:** Use `column.integer` for all boolean fields (is_in_range, is_manual_override). Convert to/from boolean in connector's `normalizeForSupabase()` and in query hook mapping.
**Warning signs:** TypeScript errors about missing column type, runtime "column type not found" errors

### Pitfall 2: Meter Value Precision Loss
**What goes wrong:** Meter reading `12345.67` becomes `12345.66999...` after round-trip through PowerSync
**Why it happens:** SQLite REAL type uses IEEE 754 floating point
**How to avoid:** Store as `column.text` in PowerSync (v2.0 decision). Parse to number only for display/calculation. In Supabase, use `NUMERIC(15,2)` which preserves exact decimal values.
**Warning signs:** Meter values displaying with trailing decimals, values changing after sync

### Pitfall 3: Sync Rules Subquery Support Uncertainty
**What goes wrong:** Dashboard sync rules reject `IN (SELECT ...)` syntax
**Why it happens:** PowerSync sync rules use a SQL subset. While data queries support filtering by bucket parameters, complex subqueries may not be fully supported in all versions.
**How to avoid:** Test sync rules in PowerSync dashboard before deploying. The safest approach mirrors existing `farm_wells` pattern -- use `farm_id` as bucket parameter and add readings/allocations to the same bucket or a parallel bucket with same parameters.
**Warning signs:** Sync rules validation errors in PowerSync dashboard, data not syncing to clients

### Pitfall 4: RLS Policy Drift from Migration 013 Drop
**What goes wrong:** New readings/allocations tables created without RLS enabled, or with stale policy names
**Why it happens:** Migration 013 dropped allocations and readings tables (and their policies). Migration 011 defined policies for them, but those policies no longer exist.
**How to avoid:** The new migration must re-create RLS policies from scratch. Use the patterns from migration 011 as a template but update role names to the four-role system (super_admin, grower, admin, meter_checker).
**Warning signs:** Data accessible without authentication, permission errors when legitimate users try to create readings

### Pitfall 5: Connector Upload Order with Foreign Keys
**What goes wrong:** Offline-created reading references a well_id that hasn't synced yet
**Why it happens:** PowerSync processes CRUD operations in order, but a reading created offline referencing a well that was also created offline might upload in wrong order
**How to avoid:** PowerSync handles this by retrying failed uploads. The `isPermanentError` function correctly identifies FK violations (23503) as permanent, but in practice both the well and reading should have different transaction batches. Monitor for FK constraint errors during testing.
**Warning signs:** "foreign key constraint" errors in connector logs, readings failing to upload

### Pitfall 6: Allocation Overlap Periods
**What goes wrong:** Two allocation periods for the same well have overlapping date ranges, making usage calculation ambiguous
**Why it happens:** No database constraint prevents overlapping periods
**How to avoid:** Add a CHECK constraint or trigger that validates no overlapping periods for the same well_id. Alternatively, handle overlap detection in the client-side validation only (simpler, allows offline creation without complex constraint checking).
**Warning signs:** Usage gauge shows incorrect values because a reading falls into multiple allocation periods

### Pitfall 7: Reading Value Format Mismatch Between Supabase and PowerSync
**What goes wrong:** Supabase stores NUMERIC(15,2) but PowerSync stores as TEXT. Connector tries to upsert a string into a numeric column.
**Why it happens:** PowerSync sends the value as stored locally (TEXT), Supabase expects NUMERIC.
**How to avoid:** PostgreSQL automatically casts text to numeric for INSERT/UPDATE operations. The Supabase client handles this transparently. Test with actual values to confirm.
**Warning signs:** Type cast errors during sync upload

## Code Examples

Verified patterns from official sources and existing codebase:

### Supabase Migration: readings table
```sql
-- Based on: migration 017 (wells), success criteria column names, v2.0 decisions
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    value NUMERIC(15,2) NOT NULL,           -- Raw cumulative meter value
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gps_latitude NUMERIC(10,8),             -- NULL if GPS unavailable
    gps_longitude NUMERIC(11,8),            -- NULL if GPS unavailable
    is_in_range BOOLEAN DEFAULT FALSE,      -- Computed at recording time
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_readings_well_id ON readings(well_id);
CREATE INDEX idx_readings_recorded_at ON readings(recorded_at);
CREATE INDEX idx_readings_well_recorded_at ON readings(well_id, recorded_at DESC);

-- Trigger for updated_at (reuse existing function from migration 001)
CREATE TRIGGER update_readings_updated_at
    BEFORE UPDATE ON readings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Supabase Migration: allocations table
```sql
-- Based on: success criteria columns, v2.0 decisions (period-based, not annual)
CREATE TABLE IF NOT EXISTS allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    allocated_af NUMERIC(10,2) NOT NULL CHECK (allocated_af > 0),
    used_af NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT allocations_period_valid CHECK (period_end > period_start)
);

-- Indexes
CREATE INDEX idx_allocations_well_id ON allocations(well_id);
CREATE INDEX idx_allocations_period ON allocations(well_id, period_start, period_end);

-- Trigger for updated_at
CREATE TRIGGER update_allocations_updated_at
    BEFORE UPDATE ON allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### RLS Policies for readings (Template from migration 011, updated for four-role system)
```sql
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- All farm members can view readings
CREATE POLICY "Members can view farm readings"
    ON readings FOR SELECT
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));

-- All farm members can create readings
CREATE POLICY "Members can create readings"
    ON readings FOR INSERT
    WITH CHECK (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));

-- Grower/admin can update readings (v2.0 decision: READ-05)
CREATE POLICY "Grower or admin can update readings"
    ON readings FOR UPDATE
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
    ));

-- Grower/admin can delete readings (v2.0 decision: READ-06)
CREATE POLICY "Grower or admin can delete readings"
    ON readings FOR DELETE
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_admin_farm_ids())
    ));
```

### RLS Policies for allocations (v2.0 decision: anyone with well access can set allocations)
```sql
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- All farm members can view allocations
CREATE POLICY "Members can view farm allocations"
    ON allocations FOR SELECT
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));

-- All farm members can create allocations (v2.0 decision)
CREATE POLICY "Members can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));

-- All farm members can update allocations
CREATE POLICY "Members can update allocations"
    ON allocations FOR UPDATE
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));

-- All farm members can delete allocations
CREATE POLICY "Members can delete allocations"
    ON allocations FOR DELETE
    USING (well_id IN (
        SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids())
    ));
```

### @turf/distance Usage
```typescript
// Source: @turf/distance official docs (https://turfjs.org/docs/api/distance)
// Coord type accepts: Position ([lng, lat]), Point, or Feature<Point>
import { distance } from '@turf/distance';

// Direct position arrays -- simplest approach
const distInFeet = distance(
  [-119.4179, 36.7783],  // [lng, lat] -- user position
  [-119.4200, 36.7800],  // [lng, lat] -- well position
  { units: 'feet' },
);
// Returns: number (distance in feet)
```

### PowerSync Schema Addition
```typescript
// Add to existing powersync-schema.ts
const readings = new TableV2({
  well_id: column.text,
  value: column.text,           // TEXT preserves decimal precision
  recorded_by: column.text,
  recorded_at: column.text,
  gps_latitude: column.real,
  gps_longitude: column.real,
  is_in_range: column.integer,  // 0/1 boolean
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const allocations = new TableV2({
  well_id: column.text,
  period_start: column.text,
  period_end: column.text,
  allocated_af: column.text,    // TEXT preserves decimal precision
  used_af: column.text,         // TEXT preserves decimal precision
  is_manual_override: column.integer,  // 0/1 boolean
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

// Add to AppSchema
export const AppSchema = new Schema({
  farms, users, farm_members, farm_invites, wells,
  readings,      // NEW
  allocations,   // NEW
});

// Add type exports
export type Reading = Database['readings'];
export type Allocation = Database['allocations'];
```

## Discretion Recommendations

### Reading value storage in Supabase: Use NUMERIC(15,2)
**Recommendation:** `NUMERIC(15,2)` in Supabase (exact decimal), `column.text` in PowerSync (preserves precision during sync). PostgreSQL NUMERIC stores exact values, and auto-casts from text during INSERT. This is the safest approach given the v2.0 decision that PowerSync stores as TEXT.

### Well equipment status columns: Already exist, DO NOT add in this migration
**Recommendation:** The wells table already has `battery_state`, `pump_state`, and `meter_status` columns (added in migration 017). Phase 14 (Meter Problem) will update these existing columns. No schema changes needed for equipment status in Phase 12.

### Allocation period overlap rules: Validate client-side only
**Recommendation:** Do NOT add overlap-prevention constraints in the database. Overlapping periods are an edge case that complicates offline creation (PowerSync can't check constraints locally). Instead, add client-side validation in Phase 15 when the allocation CRUD UI is built. If overlapping periods exist, usage calculation should use the most recent period. This keeps Phase 12 simple -- infrastructure only.

### RLS policy design: Follow established patterns
**Recommendation:** Match migration 011's patterns with updated role names. Key v2.0 decisions:
- **Readings INSERT:** All farm members (not just grower/admin) -- meter checkers need to create readings
- **Readings UPDATE/DELETE:** Grower/admin only (v2.0 decision READ-05, READ-06)
- **Allocations all operations:** All farm members (v2.0 decision: "Anyone with well access can set allocations")

### PowerSync sync rules: Add to existing bucket or create parallel buckets
**Recommendation:** Create parallel buckets (`farm_readings`, `farm_allocations`) with the same parameter query as `farm_wells`. Data queries use `WHERE well_id IN (SELECT id FROM wells WHERE farm_id = bucket.farm_id)`. This mirrors the established bucket-per-relationship pattern and keeps sync granularity manageable.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Annual allocations (well_id + year, UNIQUE) | Period-based allocations (period_start, period_end) | v2.0 design | Multiple overlapping/sequential periods per well, flexible dates |
| PostGIS for well location | Simple lat/lng NUMERIC columns | Migration 013/017 | Simpler schema, client-side distance calc via @turf/distance |
| Readings RLS: creator can update/delete own | Grower/admin only for update/delete | v2.0 decision | Meter checkers can only create, not modify |
| gps_verified boolean on readings | is_in_range boolean (computed from threshold) | v2.0 design | Clearer naming, computed from explicit 500ft threshold |

**Deprecated/outdated:**
- Migration 001's `allocations` table (year-based, dropped in migration 013): Replaced by period-based design
- Migration 001's `readings` table (different column set, dropped in migration 013): Replaced by updated schema
- Migration 001's PostGIS `wells.location` column: Replaced by simple lat/lng in migration 017

## Open Questions

1. **PowerSync sync rules: subquery support in data queries**
   - What we know: PowerSync docs show parent-child bucket patterns. RLS policies (Supabase-side) use `IN (SELECT ...)` subqueries successfully. The existing sync rules use simple `WHERE farm_id = bucket.farm_id` patterns.
   - What's unclear: Whether PowerSync dashboard accepts `WHERE well_id IN (SELECT id FROM wells WHERE farm_id = bucket.farm_id)` in data queries. The docs show simpler examples.
   - Recommendation: Test in PowerSync dashboard during implementation. Fallback: add a `farm_id` column to readings and allocations tables (denormalized) to enable direct `WHERE farm_id = bucket.farm_id` filtering. This adds redundancy but guarantees sync rule compatibility.

2. **Allocation used_af recalculation trigger**
   - What we know: Usage is auto-calculated from readings within the allocation period (ALLOC-05). Manual override is possible (ALLOC-06).
   - What's unclear: Should `used_af` be auto-updated via a Supabase trigger when a reading is inserted, or should it be calculated client-side and written back?
   - Recommendation: Defer to Phase 15 (Allocation Management). Phase 12 just creates the column. Client-side calculation is simpler and works offline. A trigger would conflict with manual override.

3. **Migration number**
   - What we know: The last migration is 030_drop_disable_feature.sql.
   - What's unclear: Whether any unpushed migrations exist.
   - Recommendation: Use 031 as the next migration number. Verify no conflicts before applying.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/powersync-schema.ts` -- TableV2 column types, schema pattern
- Existing codebase: `src/lib/powersync-connector.ts` -- ALLOWED_TABLES, normalizeForSupabase, upload pattern
- Existing codebase: `src/hooks/useWells.ts` -- Query hook pattern with guard, memoization, type mapping
- Existing codebase: `supabase/migrations/017_create_wells_table.sql` -- Table creation pattern
- Existing codebase: `supabase/migrations/011_new_rls_policies.sql` -- RLS policy pattern for allocations/readings
- Existing codebase: `supabase/migrations/021_four_role_system.sql` -- Current role names
- Existing codebase: `docs/powersync-sync-rules.yaml` -- Current sync rules structure
- [Turf.js distance docs](https://turfjs.org/docs/api/distance) -- API, parameters, units
- [PowerSync JS Web SDK docs](https://docs.powersync.com/client-sdk-references/js-web) -- Schema, column types

### Secondary (MEDIUM confidence)
- [PowerSync data queries docs](https://docs.powersync.com/usage/sync-rules/data-queries) -- Parent-child sync pattern
- [PowerSync parameter queries docs](https://docs.powersync.com/usage/sync-rules/parameter-queries) -- Bucket parameter usage
- [@turf/helpers docs](https://www.npmjs.com/package/@turf/helpers) -- Supported units (feet, meters, miles, etc.)
- [@turf/distance npm](https://www.npmjs.com/package/@turf/distance) -- Latest version 7.3.3, Coord type accepts Position arrays

### Tertiary (LOW confidence)
- PowerSync sync rules subquery support in data queries -- Could not find explicit confirmation of `IN (SELECT ...)` in data query documentation. The existing sync rules use simple equality with bucket parameters.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- @turf/distance is the obvious choice (same family as existing @turf/circle), all other libraries already in project
- Architecture: HIGH -- Every pattern (schema, connector, hooks, RLS, sync rules) has direct precedent in the codebase
- Pitfalls: HIGH -- PowerSync boolean limitation, TEXT precision, and RLS patterns are well-documented in project memory
- GPS proximity: HIGH -- @turf/distance with `{ units: 'feet' }` is straightforward, 500ft threshold is a simple constant
- Sync rules: MEDIUM -- Subquery support in PowerSync data queries needs dashboard validation

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, all libraries mature)
