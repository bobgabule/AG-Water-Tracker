# Domain Pitfalls

**Domain:** Meter reading recording, GPS proximity verification, water allocation management, and usage calculations for an offline-first agricultural water management PWA
**Researched:** 2026-02-19
**Overall Confidence:** HIGH (based on codebase analysis, official PowerSync docs, Supabase RLS docs, GPS accuracy research, and water management domain knowledge)

---

## Critical Pitfalls

Mistakes that cause data loss, incorrect compliance data, or require architectural rewrites.

---

### Pitfall 1: NUMERIC Columns Become TEXT Strings in PowerSync SQLite

**What goes wrong:** PostgreSQL `NUMERIC(15,2)` and `NUMERIC(10,8)` columns (used for `meter_value`, `gps_latitude`, `gps_longitude`, `acre_feet`) are synced to PowerSync's local SQLite as TEXT strings, not as floating-point numbers. Code that performs arithmetic directly on PowerSync query results without parsing produces string concatenation instead of math (`"100" + "50"` = `"10050"` instead of `150`).

**Why it happens:** PowerSync's sync rules use SQLite's type system. The official docs state: "These types [NUMERIC/DECIMAL] have arbitrary precision in Postgres, so can only be represented accurately as text in SQLite." This preserves precision but changes the type contract.

**Consequences:**
- Usage calculations (`currentReading - previousReading`) produce garbage or NaN
- Allocation percentage calculations silently produce NaN or wrong results
- GPS distance calculations fail or produce wildly wrong distances
- Unit conversions produce incorrect values
- These bugs may not surface in testing if test data happens to coerce correctly

**Prevention:**
- Always `parseFloat()` or `Number()` when reading NUMERIC columns from PowerSync queries
- Define typed row interfaces with `string` for these columns (matching what SQLite actually returns), then parse in the mapping layer (the existing `useWells` hook already does this correctly for `latitude`/`longitude` -- follow that pattern)
- Create a dedicated parsing utility: `parseNumeric(value: string | number | null): number | null`
- Add runtime assertions in development mode that verify parsed values are finite numbers
- For the new `readings` and `allocations` PowerSync schema definitions, use `column.text` for NUMERIC columns (not `column.real`) to match what actually arrives

**Detection:** Unit tests that use real PowerSync query results (not mocked numbers). If `typeof row.meter_value === 'string'` and code does `row.meter_value - previousValue`, the result is `NaN`.

**Confidence:** HIGH -- verified in official PowerSync types documentation at https://docs.powersync.com/usage/sync-rules/types

**Phase relevance:** Meter reading recording, usage calculation, allocation display -- must be handled in hook layer from day one

---

### Pitfall 2: Floating-Point Arithmetic Corrupts Usage and Allocation Calculations

**What goes wrong:** Even after parsing NUMERIC TEXT to JavaScript numbers, floating-point arithmetic introduces precision errors. Water usage calculations involve large numbers (meter readings in hundreds of thousands of gallons) and precise conversions (1 AF = 325,851 gallons, 1 CF = 7.4805 gallons). Accumulated floating-point errors cause allocation percentages to be slightly off, readings to appear to not match, and "similar reading" warnings to false-trigger.

**Why it happens:** JavaScript uses IEEE 754 double-precision floats. `0.1 + 0.2 !== 0.3`. When dividing large gallon values by 325,851 to convert to acre-feet, errors accumulate. When comparing two readings to check if they are "similar," floating-point comparison (`===`) fails for values that should be equal.

**Consequences:**
- Allocation gauge shows 99.97% instead of 100%, or 100.02% instead of 100%
- "Similar reading" warnings trigger incorrectly because `12345.67 !== 12345.670000000001`
- Usage summaries across multiple wells don't add up to the farm total
- Regulatory compliance reports show inconsistent numbers

**Prevention:**
- Perform all usage math in the **smallest unit** (gallons or cubic feet as integers) and convert to acre-feet only for display
- Use a rounding function with explicit precision for all display values: `roundToDecimal(value, decimals)`
- For "similar reading" comparison, use an epsilon: `Math.abs(a - b) < 0.01` not `a === b`
- Store conversion constants as exact values: `const GALLONS_PER_ACRE_FOOT = 325851` (integer)
- Use `toFixed(2)` only for final display, never for intermediate calculations
- Consider storing and comparing readings as integers (multiply by 100 to preserve 2 decimal places)

**Detection:** Test with values like `meter_value = 999999.99` and `multiplier = 0.01`. If `999999.99 * 0.01` doesn't produce the expected result, floating point is biting.

**Confidence:** HIGH -- well-documented JavaScript limitation, especially critical given the conversion factors in this domain

**Phase relevance:** Usage calculation, allocation display, similar reading warnings

---

### Pitfall 3: Multiplier Stored as TEXT with Special "MG" Value Breaks Naive Parsing

**What goes wrong:** The `wells.multiplier` column stores values like `"0.01"`, `"1"`, `"10"`, `"1000"`, and the special value `"MG"` (million gallons). Code that does `parseFloat(well.multiplier)` gets `NaN` for the `"MG"` case, silently corrupting all usage calculations for that well.

**Why it happens:** The multiplier is a TEXT column in PostgreSQL with a CHECK constraint: `CHECK (multiplier IN ('0.01', '1', '10', '1000', 'MG'))`. The "MG" value is not a numeric multiplier but a unit indicator (1 meter tick = 1,000,000 gallons). This dual-purpose field (sometimes a numeric multiplier, sometimes a unit code) is a design trap.

**Consequences:**
- `parseFloat("MG")` returns `NaN`
- `NaN * meterReading` = `NaN` -- usage displays as NaN, blank, or zero
- Allocation percentage becomes `NaN / allocation = NaN`
- If usage is `NaN`, the "under/over allocation" check may silently pass (since `NaN < allocation` is `false`)

**Prevention:**
- Create a dedicated function that handles the MG case explicitly:
  ```typescript
  function getMultiplierValue(multiplier: string): number {
    if (multiplier === 'MG') return 1_000_000;
    const parsed = parseFloat(multiplier);
    if (isNaN(parsed)) throw new Error(`Invalid multiplier: ${multiplier}`);
    return parsed;
  }
  ```
- Calculate actual usage as: `(currentReading - previousReading) * getMultiplierValue(multiplier)`
- Unit tests must include the MG multiplier case for every calculation path
- Consider refactoring the schema to separate multiplier (always numeric) from unit type, but for now handle it in the application layer

**Detection:** Query for wells where `multiplier = 'MG'` and verify usage calculations produce valid numbers.

**Confidence:** HIGH -- directly observed in schema at `c:/Users/Bobits/AG-Water-Tracker/supabase/migrations/017_create_wells_table.sql`

**Phase relevance:** Meter reading recording, usage calculation

---

### Pitfall 4: PowerSync Connector Missing New Tables -- Offline Readings Silently Lost

**What goes wrong:** The existing `SupabaseConnector.uploadData()` in `powersync-connector.ts` has a hardcoded `ALLOWED_TABLES` set: `new Set(['farms', 'users', 'farm_members', 'farm_invites', 'wells'])`. When `readings` and `allocations` tables are added to the PowerSync schema, offline writes to those tables are silently dropped because the connector skips unknown tables with only a console error. Additionally, `normalizeForSupabase` needs updating for the `readings` table's `gps_verified` BOOLEAN column (must convert INTEGER 0/1 to boolean, exactly like `wells.send_monthly_report`).

**Why it happens:** The connector was built before readings and allocations existed. The `applyOperation` method checks `ALLOWED_TABLES.has(table)` and returns early if the table is not in the set.

**Consequences:**
- Readings created offline are stored in local SQLite but **never sync to Supabase**
- The agent thinks the reading was saved successfully (it is visible locally)
- If the device is lost, reset, or app data cleared, all offline readings are gone permanently
- Allocations created offline similarly fail to sync
- `gps_verified` arrives at Supabase as `0` or `1` instead of `false`/`true`, potentially causing type mismatch errors

**Prevention:**
- Add `'readings'` and `'allocations'` to the `ALLOWED_TABLES` set
- Update `normalizeForSupabase()` to handle boolean conversion for `readings.gps_verified`
- Add `readings` and `allocations` table definitions to `powersync-schema.ts`
- Update sync rules on the PowerSync dashboard to include the new tables
- Write an integration test: create a reading offline, go online, verify it appears in Supabase

**Detection:** Create a reading while offline, go online, check if it appears in Supabase. If not, the connector is dropping it.

**Confidence:** HIGH -- directly observed in `c:/Users/Bobits/AG-Water-Tracker/src/lib/powersync-connector.ts` lines 9 and 97-105

**Phase relevance:** MUST be done FIRST before any reading/allocation feature work. This is a prerequisite.

---

### Pitfall 5: Readings and Allocations Tables Do Not Exist in PostgreSQL

**What goes wrong:** The original `readings` and `allocations` tables were created in migration 001, then ALL tables were dropped in migration 013. Migration 017 recreated ONLY the `wells` table. The `readings` and `allocations` tables currently DO NOT EXIST in Supabase. If PowerSync schema changes are deployed without a Supabase migration to recreate these tables, every offline reading will fail to sync with a permanent error (table not found / foreign key violation) and be silently discarded by the connector.

**Why it happens:** Migration 013 (`drop_wells_tables.sql`) dropped all three tables as part of a schema overhaul. Migration 017 only recreated wells with the new column structure. API.md still documents the readings and allocations tables as if they exist. The task list references the original schema.

**Consequences:**
- Complete data loss for every reading and allocation created by field agents
- `isPermanentError` returns true for table-not-found errors
- `transaction.complete()` discards the data with no recovery possible
- Field agents lose potentially weeks of work

**Prevention:**
- Create a NEW Supabase migration (e.g., `031_create_readings_allocations.sql`) that creates both tables with the updated schema
- Include: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, RLS policies using `get_user_farm_ids()`, proper indexes
- Deploy this migration to Supabase BEFORE deploying any PowerSync schema changes or app updates
- Verify with: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('readings', 'allocations')`
- Consider adding new columns not in the original schema: `gps_accuracy`, `problem_type`, `problem_notes` on readings; `period_start`/`period_end` on allocations (future-proofing)

**Detection:** PowerSync connector logs showing permanent errors (PGRST116 or 42P01). Readings disappearing after device goes online.

**Confidence:** HIGH -- directly confirmed by examining migrations 013 and 017

**Phase relevance:** Absolute first step. Nothing else works without this.

---

### Pitfall 6: GPS Proximity Check Unreliable in Agricultural Field Conditions

**What goes wrong:** The planned GPS proximity verification (100m threshold) uses the browser's Geolocation API, which returns wildly inaccurate positions in rural/agricultural areas. A field agent standing next to a well may get GPS accuracy of 500m+ due to poor cellular signal and no Wi-Fi, causing a false "out of range" result.

**Why it happens:**
- Smartphone GPS in open agricultural areas typically achieves 5-10m accuracy with good satellite visibility, BUT requires 30-60 seconds for a cold GPS fix
- `getCurrentPosition()` returns the fastest available fix, often cell-tower-based (1000m+ accuracy) rather than GPS-based
- The existing `useGeolocation` hook uses `getCurrentPosition()` with a 5-second timeout -- insufficient for a cold GPS fix in rural areas
- The `accuracy` property of `GeolocationCoordinates` reports the 95% confidence radius in meters but is typically ignored in proximity checks
- Research shows GPS accuracy in agricultural land use can degrade to 2000m+ mean error

**Consequences:**
- Field agents marked "out of range" when standing at the well -- frustrating UX
- Management loses trust in GPS verification data
- Agents start ignoring the proximity warning, defeating its purpose
- If GPS is implemented as a hard gate, readings cannot be submitted at all

**Prevention:**
- **GPS proximity is a WARNING, never a BLOCKER.** Always allow submission. Show a clear badge but never disable Save.
- **Always check `coords.accuracy`** before proximity determination. If accuracy > threshold, show "GPS accuracy too low" instead of "out of range"
- Use `watchPosition()` instead of `getCurrentPosition()` for reading submission to allow GPS to refine over 10-15 seconds
- Store the raw accuracy value alongside GPS coordinates (add `gps_accuracy NUMERIC(8,2)` column to readings)
- Set a generous proximity threshold: 200m rather than 100m, or make it configurable per farm
- Show the accuracy circle on a mini-map so the agent sees how reliable their fix is
- If GPS is unavailable (permission denied, no signal), record with null coordinates and `gps_verified = false`

**Detection:** Test on actual mobile devices in rural areas, not just browser DevTools with simulated coordinates.

**Confidence:** HIGH -- supported by GPS accuracy studies (PMC, Wiley 2025) and MDN documentation on GeolocationCoordinates.accuracy

**Phase relevance:** GPS proximity verification, reading form

---

### Pitfall 7: Concurrent Offline Readings from Multiple Agents Create Ordering Conflicts

**What goes wrong:** Two field agents both take readings on the same well while offline. Agent A reads 12500 at 9:00 AM, Agent B reads 12600 at 10:00 AM. If Agent B syncs first, then Agent A syncs, any server-side "reading must be greater than previous" validation rejects Agent A's reading (12500 < 12600) even though it was chronologically earlier.

**Why it happens:** PowerSync's upload queue processes FIFO per-client, but there is no global ordering across clients. Server-side validation checks the latest reading in the database, which may already include a later reading from another client. The connector treats constraint violations as permanent errors and silently discards them via `transaction.complete()`.

**Consequences:**
- Valid readings rejected by server-side validation
- Agent A's reading is permanently lost (discarded by connector)
- Usage calculations become inaccurate
- No UI feedback that the reading was rejected

**Prevention:**
- **Do NOT enforce strict "must be greater than previous" on the server for INSERT.** Use it as a client-side warning only. Accept all readings.
- Sort readings by `reading_date` (agent-provided timestamp), not by `created_at` (server timestamp), for all usage calculations
- When calculating usage, use chronologically sorted pairs, not insertion order
- For "similar reading" warnings, compare against the chronologically closest reading
- PowerSync's per-client operation ID can deduplicate if the same reading is uploaded twice
- Surface sync failures to the UI instead of silently discarding

**Detection:** Test: two devices offline, both submit readings for same well, bring both online in reverse chronological order.

**Confidence:** HIGH -- confirmed by PowerSync conflict resolution docs and existing `isPermanentError` handling in connector

**Phase relevance:** Meter reading recording, concurrent field operations

---

### Pitfall 8: Reading-to-Allocation Unit Mismatch Silently Produces Wrong Percentages

**What goes wrong:** Wells have a `units` field (`AF`, `GAL`, `CF`) and a `multiplier`. Allocations are stored in `acre_feet`. When calculating "percentage of allocation used," code must convert reading-based usage into acre-feet first. If conversion is skipped or uses wrong direction, a well reading 1000 gallons appears as 1000 acre-feet (325 million gallons), showing 6667% of a 15 AF allocation.

**Why it happens:** The calculation chain is:
1. `(currentReading - previousReading)` = raw meter ticks
2. `rawTicks * multiplierValue` = actual volume in the well's units
3. Convert to acre-feet for comparison with allocation

Multiple conversion steps with multiple unit types create many opportunities for error.

**Consequences:**
- Allocation gauges show wildly wrong percentages
- Farmers make incorrect decisions about water usage
- Compliance reporting shows incorrect usage vs. allocation
- If allocation warnings are automated, false alarms or missed alarms

**Prevention:**
- Create a single, well-tested conversion pipeline function:
  ```typescript
  function calculateUsageInAcreFeet(readingDelta: number, multiplier: string, units: string): number
  ```
- Map all paths explicitly:
  - `AF` units: `delta * multiplierValue` (already in acre-feet)
  - `GAL` units: `(delta * multiplierValue) / 325851`
  - `CF` units: `(delta * multiplierValue) / 43560`
- Unit test every combination of `units` x `multiplier` (15 combinations: 5 multipliers x 3 unit types)
- Display units alongside all numbers in the UI
- Never store converted values -- always store raw readings and convert at display time

**Detection:** Create test wells with each unit type and verify the allocation gauge shows reasonable percentages.

**Confidence:** HIGH -- conversion factors well-documented (1 AF = 325,851 gallons = 43,560 cubic feet)

**Phase relevance:** Usage calculation, allocation display, allocation gauge component

---

## Moderate Pitfalls

Mistakes that cause degraded UX, data quality issues, or significant rework.

---

### Pitfall 9: PowerSync Schema, Sync Rules, and Supabase Out of Sync

**What goes wrong:** Adding `readings` and `allocations` requires coordinated changes in THREE places: (1) Supabase migration, (2) PowerSync client schema (`powersync-schema.ts`), (3) PowerSync dashboard sync rules. If any one is missed or has a column name mismatch, data silently fails to sync or arrives with null values.

**Why it happens:** PowerSync separates source of truth (PostgreSQL), sync configuration (dashboard), and client schema (TypeScript). There is no automated validation. The sync rules in `docs/powersync-sync-rules.yaml` are documentation only.

**Consequences:**
- Columns missing from sync rules = null in local SQLite (no error)
- Table in client schema but not in sync rules = always empty locally
- Boolean columns not converted in connector = type errors on upload
- NUMERIC columns defined as `column.real` in client schema but arriving as TEXT = silent coercion

**Prevention:**
- Checklist for every new table/column:
  1. Supabase migration (SQL)
  2. PowerSync dashboard sync rules (bucket definitions)
  3. `powersync-schema.ts` (table/column definitions)
  4. `powersync-connector.ts` (ALLOWED_TABLES, normalizeForSupabase)
  5. `docs/powersync-sync-rules.yaml` (documentation)
- For NUMERIC columns, use `column.text` in PowerSync schema
- Verify after deployment: create record in Supabase, confirm it syncs to client; create on client, confirm it syncs to Supabase

**Detection:** After adding tables, create test records in both directions and verify round-trip.

**Confidence:** HIGH -- most common PowerSync integration issue

**Phase relevance:** Must be addressed at the very start, before any feature code

---

### Pitfall 10: RLS Policy Performance Degrades with Nested Subqueries on Readings

**What goes wrong:** Existing RLS for `readings` uses nested subqueries: `well_id IN (SELECT id FROM wells WHERE farm_id IN (SELECT get_user_farm_ids()))`. Every SELECT on `readings` executes this for EVERY ROW. With hundreds of readings per well across dozens of wells, queries become slow.

**Why it happens:** Supabase docs warn: "Complex RLS policies with subqueries execute for every row in a table." The readings table will be the highest-volume table (hundreds per well per year).

**Consequences:**
- Reading list queries take seconds instead of milliseconds
- Dashboard loading time increases as readings accumulate
- PowerSync sync time increases (server-side query feeding sync is slow)

**Prevention:**
- **Recommended:** Add a `farm_id` column to `readings` (denormalize). Populate via trigger on INSERT: `NEW.farm_id := (SELECT farm_id FROM wells WHERE id = NEW.well_id)`. Then RLS becomes: `USING (farm_id IN (SELECT get_user_farm_ids()))` -- single-level, fast.
- Add proper indexes: `idx_readings_well_date ON readings(well_id, reading_date DESC)` and `idx_readings_farm_id ON readings(farm_id)` if denormalizing
- Use `EXPLAIN ANALYZE` to verify query plans after creating policies

**Detection:** After 1000+ readings, `EXPLAIN ANALYZE` a SELECT as an authenticated user; check for sequential scans.

**Confidence:** HIGH -- Supabase RLS performance docs explicitly warn about this pattern

**Phase relevance:** Readings table creation, RLS policy design

---

### Pitfall 11: Client-Side gps_verified Cannot Be Trusted for Compliance

**What goes wrong:** `readings.gps_verified` is calculated entirely client-side. A buggy client, spoofed GPS, or code error can send `gps_verified: true` regardless of actual location.

**Why it happens:** Offline-first architecture means the client creates readings without server validation. GPS coordinates, accuracy, and verification flag are all client-provided.

**Prevention:**
- Store raw GPS coordinates AND `gps_accuracy` in every reading
- Calculate `gps_verified` client-side for immediate UX feedback
- Optionally recalculate server-side using Haversine formula during sync (well lat/lng available)
- At minimum, store raw data so `gps_verified` can be recomputed later
- Display as informational, not a hard compliance gate

**Confidence:** HIGH -- fundamental offline-first security consideration

**Phase relevance:** GPS proximity verification, reading submission

---

### Pitfall 12: Reading Timestamps in Wrong Timezone

**What goes wrong:** `reading_date` is `TIMESTAMPTZ` in PostgreSQL. When created offline, `new Date().toISOString()` produces UTC. If displayed without timezone conversion, a reading at 2 PM Central Time appears as 8 PM. Readings near midnight UTC cross date boundaries, affecting period-based filtering.

**Why it happens:** JavaScript `Date.toISOString()` outputs UTC. PowerSync stores string as-is. Kansas is UTC-6 (Central Time).

**Consequences:**
- Readings appear taken at wrong time
- "Future reading" validation triggers incorrectly near midnight
- Date range filtering may misattribute readings to wrong allocation period

**Prevention:**
- Store as UTC (correct, already planned)
- Display with locale-aware formatting: `new Date(reading.reading_date).toLocaleString()` or `Intl.DateTimeFormat`
- For date range filtering, convert boundaries to UTC before querying
- Never compare date strings directly -- parse to Date objects

**Detection:** Create reading at 11 PM Central, verify it displays as 11 PM not 5 AM next day.

**Confidence:** HIGH -- universal JavaScript date pitfall, amplified by offline storage

**Phase relevance:** Meter reading form, reading display, allocation period calculations

---

### Pitfall 13: Meter Rollover / Meter Replacement Not Handled

**What goes wrong:** Water meters are cumulative. When a meter reaches max (e.g., 999999), it rolls over to 000000. If the app only rejects lower-than-previous readings, legitimate rollovers and meter replacements are flagged as errors. Usage calculation produces massive negative numbers.

**Prevention:**
- When `current < previous`, check if it could be a rollover: `usage = (maxMeterValue - previous) + current`
- Consider adding `meter_max_value` to wells, or default to common values (999999, 9999999)
- Allow agent to note "meter replaced" or "meter rolled over" via a flag or notes
- Flag for admin review rather than rejecting
- The "similar reading" warning should handle rollover-adjacent values gracefully

**Detection:** Test with readings near rollover boundary (previous=999990, current=000050).

**Confidence:** MEDIUM -- rollovers are real but rare; "meter replaced" is the more common scenario

**Phase relevance:** Meter reading recording, usage calculation

---

### Pitfall 14: Allocation Period Schema Assumes Calendar Year

**What goes wrong:** `allocations` uses `year INTEGER` with `UNIQUE(well_id, year)`. Real water rights periods vary (Kansas uses calendar year, but other states use Oct-Sep water years). Even within Kansas, some permits have non-standard provisions.

**Prevention:**
- Keep `year` for now -- it works for Kansas calendar-year allocations
- Design calculation code to accept `startDate` and `endDate` parameters, not just `year`
- Don't hardcode Jan 1 - Dec 31 in queries. Derive: `startDate = new Date(year, 0, 1)`
- Document the assumption. Plan for future `start_date`/`end_date` columns.

**Confidence:** MEDIUM -- works for Kansas but limits future expansion

**Phase relevance:** Allocation management, usage calculation

---

### Pitfall 15: Similar Reading Warning Ignores Multiplier Context

**What goes wrong:** A "similar reading" warning comparing raw meter ticks ignores the multiplier. A delta of 1 on `multiplier: 1000` = 1000 gallons (significant), while delta of 1 on `multiplier: 0.01` = 0.01 gallons (negligible). Also, if the multiplier changed between readings (meter replacement), raw values are not comparable at all.

**Prevention:**
- Compare multiplier-applied values, not raw ticks
- Define "similar" in actual usage units (e.g., < 0.1 AF equivalent)
- If multiplier changed since last reading, note this in the warning
- Never block submission -- always allow confirmation

**Confidence:** MEDIUM -- domain-specific UX consideration

**Phase relevance:** Meter reading form, similar reading warnings

---

## Minor Pitfalls

---

### Pitfall 16: Empty PowerSync Query Guard Missing for New Hooks

**What goes wrong:** `useWells` guards against empty `farmId` with `'SELECT NULL WHERE 0'`. New hooks for readings and allocations may forget this guard.

**Prevention:** Follow `useWells` pattern. Use `'SELECT NULL WHERE 0'` as fallback (documented in CLAUDE.md). Create shared constant.

**Confidence:** HIGH -- documented in project conventions

---

### Pitfall 17: useMemo Missing on Mapped Query Results

**What goes wrong:** PowerSync's `useQuery` returns new array reference each render. Without `useMemo` on mapped results, consuming components re-render unnecessarily.

**Prevention:** Wrap mapped results in `useMemo(() => ..., [data])` as `useWells` does. Documented in CLAUDE.md.

**Confidence:** HIGH -- documented in project conventions

---

### Pitfall 18: Well Location Is lat/lng Columns, Not PostGIS

**What goes wrong:** API.md references PostGIS functions (`ST_DWithin`, `ST_MakePoint`), but migration 017 uses separate `latitude`/`longitude` NUMERIC columns instead. GPS verification code following API.md will try non-existent PostGIS functions.

**Prevention:** Use Haversine formula for client-side proximity, not PostGIS. Haversine is more than accurate enough for 100-200m checks. Update API.md.

**Confidence:** HIGH -- directly observed schema mismatch

**Phase relevance:** GPS proximity verification

---

### Pitfall 19: No Loading State for GPS in Reading Form

**What goes wrong:** Reading form opens, GPS requested, no loading indicator shown. User fills in meter value and saves before GPS resolves. Reading saved without coordinates.

**Prevention:** Show explicit "Acquiring GPS..." spinner. Show persistent GPS status badge. If GPS still loading at save time, either wait briefly with overlay or save without GPS and show notification.

**Confidence:** HIGH -- UX pattern

**Phase relevance:** Reading form

---

### Pitfall 20: Large Reading History Lists on Old Devices

**What goes wrong:** Well with 500+ readings renders all in scrollable list. Old phones struggle with DOM size.

**Prevention:** Default to 20 most recent with "Load more". Use `LIMIT` in PowerSync query. Consider virtual scrolling.

**Confidence:** MEDIUM -- depends on actual usage patterns

**Phase relevance:** Well detail page, reading history

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Supabase migration | Tables don't exist (Pitfall 5) | Create migration FIRST, deploy BEFORE app changes |
| PowerSync schema setup | Missing from ALLOWED_TABLES, sync rules, or schema (Pitfall 4, 9) | Use 5-point checklist for every new table |
| Readings connector | Boolean gps_verified not normalized (Pitfall 4) | Update normalizeForSupabase immediately |
| Meter reading form | MG multiplier breaks parseFloat (Pitfall 3) | Dedicated getMultiplierValue with explicit MG handling |
| Meter reading form | GPS blocking submission (Pitfall 6) | GPS is advisory, never a blocker |
| Meter reading form | Similar reading ignores multiplier (Pitfall 15) | Compare actual usage, not raw ticks |
| GPS proximity check | Rural accuracy too poor (Pitfall 6) | Check accuracy property, use watchPosition, store accuracy |
| GPS proximity check | Well location is lat/lng not PostGIS (Pitfall 18) | Haversine formula, not ST_DWithin |
| Usage calculation | Floating-point errors (Pitfall 2) | Calculate in smallest unit, round for display only |
| Usage calculation | Unit mismatch reading vs allocation (Pitfall 8) | Single tested conversion pipeline function |
| Allocation management | Calendar year assumption (Pitfall 14) | Parameterize date range in calculation code |
| Concurrent agents | Out-of-order reading sync (Pitfall 7) | Sort by reading_date, warn don't reject on server |
| RLS for readings | Nested subquery perf (Pitfall 10) | Denormalize farm_id onto readings |
| Reading display | Timezone errors (Pitfall 12) | Convert UTC to local for display |
| Sync failure UI | Silent discard of failed uploads (Pitfall 17 from prior) | Surface sync failures to users |
| New hooks | Empty query guard, useMemo (Pitfall 16, 17) | Follow useWells pattern exactly |

---

## Sources

- [PowerSync Types Documentation](https://docs.powersync.com/usage/sync-rules/types) -- NUMERIC stored as TEXT, BOOLEAN as INTEGER (HIGH confidence)
- [PowerSync Handling Update Conflicts](https://docs.powersync.com/handling-writes/handling-update-conflicts) -- last-write-wins, idempotent operations (HIGH confidence)
- [PowerSync Custom Conflict Resolution](https://docs.powersync.com/handling-writes/custom-conflict-resolution) -- per-field timestamps (HIGH confidence)
- [PowerSync Schema Changes](https://docs.powersync.com/usage/lifecycle-maintenance/implementing-schema-changes) -- no client migrations needed, sync rules must be updated (HIGH confidence)
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) -- nested subquery perf warning (HIGH confidence)
- [MDN GeolocationCoordinates.accuracy](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy) -- 95% confidence radius in meters (HIGH confidence)
- [MDN Geolocation.getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) -- returns fastest fix, not most accurate (HIGH confidence)
- [Smartphone GPS accuracy in rural areas (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC9262051/) -- accuracy degrades in agricultural land use (MEDIUM confidence)
- [Comparing smartphone and specialist GNSS receivers (Wiley, 2025)](https://besjournals.onlinelibrary.wiley.com/doi/full/10.1002/2688-8319.70015) -- smartphone signal-to-noise issues (MEDIUM confidence)
- [Oklahoma State Water Measurement Units](https://extension.okstate.edu/fact-sheets/water-measurement-units-and-conversion-factors.html) -- 1 AF = 325,851 gallons = 43,560 cubic feet (HIGH confidence)
- [California Water Board Unit Conversions](https://www.waterboards.ca.gov/waterrights/water_issues/programs/measurement_regulation/docs/water_measurement/units.pdf) -- standard conversion factors (HIGH confidence)
- [OVO Forum: Meter rollover past 9999](https://forum.ovoenergy.com/my-account-140/what-happens-when-my-meter-goes-past-9999-6389) -- meter rollover behavior (MEDIUM confidence)
- [JavaScript Floating Point Precision](https://www.geeksforgeeks.org/javascript/floating-point-number-precision-in-javascript/) -- IEEE 754 limitations (HIGH confidence)
- [getAccurateCurrentPosition (GitHub)](https://github.com/gregsramblings/getAccurateCurrentPosition) -- watchPosition pattern for GPS refinement (MEDIUM confidence)
- [SQLite Floating Point](https://sqlite.org/floatingpoint.html) -- IEEE 754 in SQLite REAL type (HIGH confidence)
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/src/lib/powersync-connector.ts` -- ALLOWED_TABLES, normalizeForSupabase, isPermanentError
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/src/lib/powersync-schema.ts` -- current table definitions
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/supabase/migrations/017_create_wells_table.sql` -- well schema with multiplier CHECK constraint
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/supabase/migrations/013_drop_wells_tables.sql` -- dropped readings/allocations tables
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/supabase/migrations/011_new_rls_policies.sql` -- nested subquery RLS pattern
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/docs/API.md` -- stale PostGIS references
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/src/hooks/useWells.ts` -- NUMERIC parsing pattern, useMemo pattern
- Codebase: `c:/Users/Bobits/AG-Water-Tracker/src/hooks/useGeolocation.ts` -- getCurrentPosition with 5s timeout
- Project memory: `MEMORY.md` -- PowerSync BOOLEAN limitation, connector patterns

---
*Pitfalls research for: AG Water Tracker -- Meter Readings, GPS Verification, Allocation Management*
*Researched: 2026-02-19*
