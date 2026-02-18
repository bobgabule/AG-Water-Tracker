# Feature Landscape: Meter Reading, Allocation, and Well Management

**Domain:** Agricultural water management -- meter reading recording, water allocation tracking, well detail/editing
**Researched:** 2026-02-19
**Overall Confidence:** HIGH (codebase analysis) / MEDIUM (domain patterns from real-world agricultural water apps)

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Meter Reading Entry

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Single numeric input for cumulative meter value** | Field agents read a physical meter and type the number. Must be dead simple -- one big input, one tap to submit. | Low | `readings` table (new), PowerSync schema update | Raw cumulative value. Usage is calculated, never entered directly. |
| **Auto-populated reading date (now)** | 95% of readings happen "right now." Pre-filling saves taps on every entry. | Low | None | Allow manual override for backdated readings. |
| **Last reading display on form** | Agent needs context: "last reading was 45,230 on Jan 15." Without it they cannot verify the number they see on the meter makes sense. | Low | `readings` query | Show both value and date of previous reading. |
| **Calculated usage preview** | Show "(current - last) x multiplier = X AF" before saving. This is the core value proposition -- turning raw numbers into meaningful usage. | Low | Well's `multiplier` and `units` fields (exist) | Calculate on the fly as agent types. Formula: `(new_value - baseline) * multiplier_numeric`. |
| **GPS auto-capture on reading** | GPS coordinates captured automatically when opening the reading form. Agent should not have to tap a separate button. | Med | `useGeolocation` hook (exists), reading GPS columns | Silently capture. Store lat/lng on the reading record. |
| **GPS proximity indicator (non-blocking)** | Show "In Range" or "Out of Range" badge based on distance to well. Per project spec: flags but does NOT block submission. | Med | Well lat/lng, reading GPS, distance calc utility | Threshold should be configurable per farm (default ~100m per existing docs). Store `gps_verified` boolean. |
| **Offline reading submission** | Readings must save to local PowerSync DB immediately and sync when online. This is the entire point of the offline-first architecture. | Med | PowerSync connector update (add `readings` to ALLOWED_TABLES), sync rules update | Already proven pattern for wells -- same approach for readings. |
| **Reading history list on well detail** | Chronological list of past readings showing date, raw value, calculated usage, and GPS status. | Med | `readings` query, `useReadings` hook (new) | Newest first. Pagination or virtual scroll for wells with many readings. |

### Water Allocation Management

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Create allocation for a well** | Admin enters: start date, end date, allocated amount (acre-feet). This is the budget the well operates against. | Med | `allocations` table (new -- must recreate with period-based schema instead of year-only), PowerSync schema | Original schema used `year` integer. New design needs `start_date` / `end_date` for flexible periods. |
| **View current allocation on well detail** | Show the active allocation period, how much is allocated, and how much has been used. | Low | Allocation query + usage calculation | Core dashboard-level info. |
| **Usage vs. allocation gauge** | Visual indicator of percentage used. Color-coded: green (< 75%), yellow (75-90%), red (> 90%). | Med | SVG/CSS gauge component, usage calculation | The WellMarker already has a placeholder gauge (`allocationPercentage = 100`). This makes it real. |
| **Multiple allocation periods** | A well may have different allocations for different periods (seasonal, annual, multi-year). List and manage them. | Med | One-to-many relationship wells -> allocations | Only one "active" allocation at any time (based on current date falling within start/end range). |

### Well Detail Page

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Well detail page at /wells/:id** | Currently missing entirely. Clicking a well in the list or map navigates to `/wells/:id` but no route or page exists. This is the highest-priority gap. | Med | New route, new page component | Hub for everything about a well: readings, allocation, status, location. |
| **Well info display** | Show name, WMIS number, meter serial number, location, units, multiplier, status fields (battery, pump, meter). | Low | Existing `useWells` hook data | Read-only view of well properties. |
| **Add reading button (prominent)** | Primary action on well detail. Large, obvious CTA that opens the reading form. | Low | Reading form component | Should be the most prominent action on the page. Meter checkers live here. |
| **Well location on mini-map** | Small map snippet showing the well's GPS pin. Gives spatial context without leaving the detail page. | Med | Mapbox component reuse | Optional -- could be just lat/lng text for MVP and add map later. |

### Well Editing

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Edit well properties** | Admin/grower modifies: name, meter serial number, WMIS number, location, units, multiplier, report preference. | Med | Reuse AddWellFormBottomSheet with pre-populated values, PowerSync update | Permission-gated: only admin/grower roles. |
| **Update well status fields** | Change battery_state, pump_state, meter_status. These are operational status updates. | Low | PowerSync update on wells table | Can be done from well detail page or as part of reading submission. |

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Similar reading warning** | When new reading is within 5 units of the last reading, show a yellow warning: "This reading is very similar to the last one. Are you sure?" Catches accidental re-entry of old values without blocking intentional low-usage readings (e.g., winter months). | Low | Compare new value to last reading value | Per project spec. Non-blocking -- warn, not prevent. Threshold of 5 units is sensible for cumulative meters. |
| **Meter problem reporting** | Quick-select problem types: "Not Working", "Battery Dead", "Pump Off", "Dead Pump". Updates well status fields and optionally adds a note to the reading. | Low-Med | Well status field updates, optional reading with notes | Critical for field agents who encounter broken equipment. Faster than editing well properties manually. |
| **GPS accuracy display** | Show GPS accuracy radius so workers understand reading trustworthiness. "GPS accurate to ~5m" vs "GPS accurate to ~200m". | Low | `coords.accuracy` from Geolocation API | Helps explain why a reading might be marked "out of range" despite being at the well. |
| **Reading validation warnings** | Non-blocking warnings for: reading lower than previous (meter reset?), reading much higher than expected (data entry error?). | Low | Client-side checks before submit | Show warnings, allow override. Never block. |
| **Reading submission with photo** | Agent takes photo of the meter face as evidence. Stored as attachment. | High | Supabase Storage, camera API, offline photo queue | HIGH value for audit trail. HIGH complexity for offline storage + sync. Defer to later phase. |
| **Batch reading entry** | When checking multiple wells on a route, allow queuing readings across wells without navigating back to the list each time. | Med-High | Multi-well workflow UI, reading queue | Nice for efficiency but adds significant UX complexity. |
| **Usage trend sparkline** | Small inline chart on well detail showing usage over the last N readings. Visual pattern recognition for anomalies. | Med | Chart library or simple SVG, historical readings query | Useful for admins reviewing well performance. |
| **Allocation carryover / rollover** | When an allocation period ends with unused water, optionally carry it forward to the next period. Common in Kansas GMD regulations. | Med | Allocation period logic, admin setting | Relevant for districts that allow carryover. |
| **Reading reminder notifications** | Push/SMS notification when a reading is overdue (e.g., monthly reading not submitted by end of month). | High | Push notification infrastructure, scheduling | Modeled after Edwards Aquifer Authority's Meter Matters app which prompts users when readings are due. |
| **Export reading history to CSV** | Download all readings for a well or farm as CSV for reporting to water management districts. | Low-Med | CSV generation utility, download trigger | Important for compliance reporting to Kansas DWR/GMD. |

---

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Reading value validation that blocks submission** | Meter readings can legitimately decrease (meter replacement, rollback). Blocking "lower than last" readings creates field frustration when agents cannot submit valid data. | Show warning for decreasing values but always allow submission. Flag for admin review. |
| **Mandatory GPS for readings** | GPS may be unavailable (indoor meters, poor signal in rural areas). Blocking readings without GPS defeats offline-first purpose. | Auto-capture GPS when available. If unavailable, save reading without GPS. Mark as "unverified." |
| **Automatic usage calculation from meter photos (OCR)** | High complexity, unreliable in field conditions (dirty meters, glare, different meter types), and adds a heavy dependency. | Manual numeric entry is faster and more reliable for agricultural field meters. |
| **Complex allocation formulas** | Multi-variable allocation calculations (soil type, crop type, evapotranspiration) belong in specialized irrigation management software, not a meter reading app. | Simple: allocated amount in acre-feet per period. Usage = (current - baseline) x multiplier. |
| **Real-time streaming of meter data** | Requires AMR/AMI hardware integration. AG Water Tracker is for manual reading scenarios where farmers walk to meters. | Focus on manual reading entry. If automated meters exist, data import is a future feature. |
| **Multi-unit display toggle** | Showing readings simultaneously in AF, gallons, and cubic feet creates visual noise. The well has one configured unit. | Store readings in the well's configured unit. Admin sets unit at well creation. Conversion utility available if needed for reports. |
| **Reading edit/delete by field agents** | Allowing meter checkers to edit or delete readings creates audit trail problems. | Only admin/grower can edit or delete readings. Field agents can only add new readings. |
| **Notification system in-app** | Building a notification center, bell icon, and unread counts is a major feature that distracts from core reading workflow. | Rely on existing sync status banner for data status. Push notifications (if needed later) are a separate effort. |
| **Charts/graphs of reading trends** | Adds charting library dependency. Reading history as a list is sufficient for MVP. | Sorted reading list with calculated usage column. Charts are a polish feature for a future milestone. |
| **Editing past readings** | Auditing concern. Past readings should be immutable for compliance. | If a reading is wrong, add a new corrected reading with a note. Admins can add notes to existing readings. |

---

## Feature Dependencies

```
Well Detail Page ──────────────> Reading Form
     |                              |
     |                              v
     |                     GPS Proximity Check
     |                              |
     |                              v
     |                     Similar Reading Warning
     |                              |
     v                              v
Allocation Display <─────── Usage Calculation <──── readings table
     |                              ^
     v                              |
Allocation Gauge ───────────────────┘
     |
     v
WellMarker gauge (already exists as placeholder)

readings table ──────> PowerSync schema update
                            |
                            v
                       Sync rules update
                            |
                            v
                       Connector ALLOWED_TABLES update

allocations table ──────> PowerSync schema update
                               |
                               v
                          Sync rules update

Well Edit Form ──────> Reuse AddWellFormBottomSheet
                            |
                            v
                       Permission check (admin/grower only)

Meter Problem Report ──────> Well status update
                                 |
                                 v
                            Optional reading with notes
```

### Critical Path (must be built in order)

1. **Database tables** (readings + allocations) -- everything else depends on these
2. **PowerSync schema + sync rules + connector** -- offline capability for new tables
3. **Well detail page** -- container for all reading/allocation features
4. **Reading form** -- core user action
5. **Reading history** -- verify readings are saving correctly
6. **GPS proximity** -- enhance reading form
7. **Allocation CRUD** -- admin function
8. **Usage calculation + gauge** -- ties readings to allocations
9. **Well editing** -- admin function
10. **Similar reading warning + meter problem reporting** -- polish

---

## MVP Recommendation

### Must Have (Phase 1: Database and Sync Foundation)

These must ship together because they form the data layer everything depends on:

1. **readings table** in Supabase with RLS policies
2. **allocations table** in Supabase with RLS policies (period-based: start_date, end_date, allocated_amount)
3. **PowerSync schema update** adding readings and allocations tables
4. **PowerSync sync rules update** for new tables
5. **PowerSync connector update** adding readings and allocations to ALLOWED_TABLES
6. **Unit conversion and usage calculation utilities** (pure functions, testable)
7. **Haversine distance calculation utility** for GPS proximity

### Must Have (Phase 2: Well Detail and Core Reading Flow)

8. **Well detail page** at `/wells/:id` with well info, allocation status, reading history
9. **Reading form** (bottom sheet) with numeric input, auto-date, last reading display, calculated usage preview
10. **GPS auto-capture** on reading with proximity indicator (non-blocking)
11. **Reading history list** on well detail page (newest first, with usage and GPS badges)
12. **Similar reading warning** (within 5 units of last reading)
13. **Meter problem reporting** (quick status update from well detail)

### Must Have (Phase 3: Allocations and Visualization)

14. **Create/edit allocation** for a well (start date, end date, acre-feet)
15. **View active allocation** on well detail with usage percentage
16. **Allocation gauge visualization** on well detail and map markers (replacing placeholder)

### Must Have (Phase 4: Well Editing)

17. **Edit well properties** form (reuse creation form with pre-populated values)
18. **Well status update** from detail page

### Defer

- **Reading photo capture**: High complexity for offline photo queue. Requires Supabase Storage setup.
- **Batch reading entry**: Significant UX complexity. One-well-at-a-time flow works for initial use.
- **Usage trend charts**: Not needed until users have enough historical data.
- **Export to CSV**: Quick add later, not day-one essential.
- **Allocation carryover**: Varies by district. Start with simple period-based.
- **Reading reminders**: Requires push notification infrastructure.

---

## Usage Calculation Details

This is the core business logic that ties everything together. Getting it right matters.

### Formula

```
usage_in_units = (current_reading - baseline_reading) * multiplier_numeric
```

Where:
- `current_reading` = the meter value just entered
- `baseline_reading` = first reading of the allocation period (or the reading closest to allocation start date)
- `multiplier_numeric` = the well's multiplier converted to a number

### Multiplier Conversion

The well stores multiplier as text: '0.01', '1', '10', '1000', 'MG'

| Stored Value | Numeric Multiplier | Meaning |
|-------------|-------------------|---------|
| '0.01' | 0.01 | Each meter unit = 0.01 of configured unit |
| '1' | 1 | Direct reading (most common) |
| '10' | 10 | Each meter unit = 10 of configured unit |
| '1000' | 1000 | Each meter unit = 1000 of configured unit |
| 'MG' | 1000000 | Million gallons -- special case, needs unit conversion to AF |

### Unit Conversions (for display and allocation comparison)

| From | To Acre-Feet | Factor |
|------|-------------|--------|
| AF | AF | 1 |
| GAL | AF | / 325,851 |
| CF | AF | / 43,560 |
| MG (million gallons) | AF | * 3.06889 |

### Baseline Selection

The baseline reading for usage calculation is determined by:
1. The first reading on or after the allocation period start date
2. If no reading exists at period start, use the last reading before period start
3. If no prior readings exist, usage = 0 (new well)

This logic is important to get right and should be a well-tested utility function.

---

## Reading Form UX Patterns

Based on analysis of agricultural water management apps (Edwards Aquifer Authority Meter Matters, WaterVize, Anyline, Axonator) and the specific needs of field agents:

### Optimal Reading Entry Flow

1. Agent navigates to well (from map tap or well list)
2. Well detail page shows: well name, last reading, current usage, allocation gauge
3. Agent taps prominent "New Reading" button
4. **Reading form opens as bottom sheet** (consistent with existing AddWellFormBottomSheet pattern):
   - Large numeric input for meter value (pre-focused, numeric keyboard)
   - Last reading shown below input: "Last: 45,230 on Jan 15, 2026"
   - Auto-calculated usage: "Usage: 125 AF (since last reading)"
   - GPS status indicator: auto-captured, shows green/yellow badge
   - Notes field (optional, collapsed by default)
   - Similar reading warning (if triggered): yellow banner
5. Agent taps "Save Reading"
6. Returns to well detail with updated history

### Key UX Principles for Field Agents

- **Minimize taps**: Pre-fill everything possible (date, GPS). One input (meter value) is the only required action.
- **Large touch targets**: Field workers have gloves, dirty hands, bright sun glare. Buttons must be 44px+ minimum.
- **Immediate feedback**: Show calculated usage instantly as they type. No loading states for local operations.
- **Non-blocking warnings**: Similar reading and GPS warnings are yellow banners, not modal dialogs. Agent can dismiss and continue.
- **Offline confidence**: Show clear sync status. "Saved locally" with a pending sync icon. No ambiguity about whether the reading was captured.

### GPS Proximity Check Pattern

The GPS proximity check follows the geofencing "check-in" pattern used by field service apps (Mapsly, allGeo, Truein):

1. Auto-capture GPS when reading form opens (using existing `useGeolocation` hook)
2. Calculate distance between agent's position and well's stored coordinates
3. Display result as badge:
   - **Green "In Range"**: distance <= threshold (default 100m)
   - **Yellow "Out of Range (X m)"**: distance > threshold, with actual distance shown
   - **Gray "GPS Unavailable"**: location not obtained
4. Store `gps_latitude`, `gps_longitude`, `gps_verified` on the reading record
5. **Never block submission** based on GPS -- the flag is for admin review, not enforcement

Distance calculation: Haversine formula for lat/lng to meters. Simple utility function, no external library needed.

---

## Meter Problem Reporting Pattern

When a field agent arrives at a well and finds equipment issues, they need a fast way to report it without going through the full reading form.

### Problem Types (from project spec)

| Problem | Updates | Effect |
|---------|---------|--------|
| Not Working | `meter_status = 'Dead'` | Well flagged as needing maintenance |
| Battery Dead | `battery_state = 'Dead'` | Battery replacement needed |
| Pump Off | `pump_state = 'Off'` | No water flowing, expected or unexpected |
| Dead Pump | `pump_state = 'Dead'` | Pump hardware failure |

### Recommended UX

Option on well detail page: "Report Problem" button (secondary to "New Reading").

Opens a simple picker with the four problem types. Selecting one:
1. Updates the relevant well status field via PowerSync
2. Optionally creates a reading record with notes describing the problem
3. Shows confirmation toast
4. Returns to well detail with updated status

This should be a separate action from reading entry because the agent may not be able to take a reading at all (meter broken).

---

## Allocation Period Model

The original database used a simple `year` integer for allocations. The project context specifies "period-based (start/end dates)." The new allocation table should use:

```sql
allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  allocated_amount NUMERIC(10,2) NOT NULL CHECK (allocated_amount > 0),
  baseline_reading NUMERIC(15,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(well_id, start_date)
)
```

Key differences from original schema:
- `start_date` / `end_date` instead of `year` -- supports seasonal, annual, or multi-year allocations
- `allocated_amount` instead of `acre_feet` -- clearer naming, always stored in acre-feet
- `baseline_reading` -- optional field to lock in the starting meter value for this period
- `UNIQUE(well_id, start_date)` -- prevents duplicate allocation periods starting on the same date

**Note on overlap prevention**: A GiST exclusion constraint (preventing overlapping date ranges) would be ideal but requires the `btree_gist` extension. For MVP, enforce non-overlap at the application level with a check query before insert. Add the constraint later if needed.

---

## Readings Table Model

```sql
readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
  meter_value NUMERIC(15,2) NOT NULL,
  reading_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  gps_latitude NUMERIC(10,8),
  gps_longitude NUMERIC(11,8),
  gps_verified INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

Key notes:
- `gps_verified` is INTEGER (0/1) not BOOLEAN because PowerSync does not support BOOLEAN type. The connector must convert 0/1 to boolean for Supabase (same pattern used for `wells.send_monthly_report`).
- `meter_value` is cumulative -- never reset between readings
- `reading_date` can differ from `created_at` -- supports backdated readings
- `created_by` tracks which field agent recorded the reading (audit trail)

---

## Reading History Display

### List View (on well detail page)

Each reading row shows:
- **Date**: formatted relative (Today, Yesterday, 3 days ago) or absolute for older readings
- **Raw Value**: the cumulative meter reading as entered
- **Usage**: calculated difference from previous reading, with multiplier applied, in the well's unit
- **GPS Badge**: green checkmark (verified), yellow warning (out of range), gray dash (no GPS)
- **Notes**: truncated if present, expandable

### Sorting and Filtering

- Default sort: newest first
- Optional date range filter for admin review
- No pagination needed for MVP -- show last 50 readings with "Load More"

### Empty State

"No readings recorded yet. Tap 'New Reading' to record the first meter reading for this well."

---

## Existing Codebase Gaps Identified

These are specific items that must be addressed for this milestone:

| Gap | Current State | Needed |
|-----|--------------|--------|
| No `/wells/:id` route | `App.tsx` has no well detail route. Navigation to `/wells/:id` silently redirects to `/` via catch-all. | Add route and WellDetailPage component |
| No `readings` table | Dropped in migration 013, never recreated | New migration creating readings table |
| No `allocations` table | Dropped in migration 013, never recreated | New migration creating allocations table with period-based schema |
| PowerSync schema missing readings/allocations | `powersync-schema.ts` only has farms, users, farm_members, farm_invites, wells | Add readings and allocations table definitions |
| PowerSync connector blocks readings | `ALLOWED_TABLES` only includes farms, users, farm_members, farm_invites, wells | Add `readings` and `allocations` to ALLOWED_TABLES |
| Sync rules missing readings/allocations | `powersync-sync-rules.yaml` has no bucket for readings or allocations | Add sync rule buckets for both tables |
| WellMarker gauge is placeholder | `allocationPercentage = 100` hardcoded in WellMarker.tsx | Connect to real allocation data via readings query |
| No `useReadings` hook | Only `useWells` hook exists for data queries | Create hook for querying readings by well_id |
| No distance calculation utility | GPS verification concept documented but no implementation | Create Haversine distance function |
| No usage calculation utility | Usage = (current - baseline) * multiplier documented but no implementation | Create utility function with proper multiplier/unit handling |
| Connector missing boolean conversion for readings | `normalizeForSupabase` only handles `wells.send_monthly_report` | Add conversion for `readings.gps_verified` (0/1 to boolean) |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Reading form UX | HIGH | Based on codebase analysis (existing bottom sheet pattern), Edwards Aquifer Meter Matters app patterns, and standard field data collection UX |
| GPS proximity pattern | HIGH | Well-established geofencing check-in pattern (Mapsly, allGeo); existing `useGeolocation` hook proves the approach |
| Allocation model | MEDIUM | Period-based model is correct per project spec, but overlap constraint approach needs PostgreSQL extension verification |
| Usage calculation | HIGH | Standard formula confirmed by multiple sources; multiplier/unit system already exists in wells table |
| Similar reading warning | HIGH | Simple threshold comparison, explicitly specified in project context (5 units) |
| Meter problem reporting | MEDIUM | Problem types specified in project context; UX pattern is straightforward but needs user validation |
| Anti-features | HIGH | Based on strong rationale: never block readings, never require GPS, keep it simple for field agents |
| Database schema | HIGH | Follows established patterns in codebase (migrations, RLS, PowerSync); only new tables needed |

---

## Sources

### Codebase Analysis (PRIMARY -- HIGH confidence)
- PowerSync schema: `src/lib/powersync-schema.ts` -- wells table structure, missing readings/allocations
- PowerSync connector: `src/lib/powersync-connector.ts` -- ALLOWED_TABLES, uploadData pattern, boolean normalization
- Well creation form: `src/components/AddWellFormBottomSheet.tsx` -- existing bottom sheet pattern for form reuse
- Permissions: `src/lib/permissions.ts` -- `record_reading` action already defined for meter_checker role
- Routes: `src/App.tsx` -- no well detail route exists, catch-all redirects `/wells/:id` to `/`
- Geolocation: `src/hooks/useGeolocation.ts` -- existing hook with caching, StrictMode handling
- Migrations: `supabase/migrations/013_drop_wells_tables.sql` -- readings/allocations dropped, never recreated
- Current wells schema: `supabase/migrations/017_create_wells_table.sql` -- multiplier, units, status fields
- WellMarker: `src/components/WellMarker.tsx` -- placeholder allocation gauge (`allocationPercentage = 100`)
- WellListPage: `src/pages/WellListPage.tsx` -- navigates to `/wells/:id` but route does not exist
- DashboardPage: `src/pages/DashboardPage.tsx` -- well save pattern via PowerSync `db.execute`

### Domain Research (MEDIUM confidence)
- [Edwards Aquifer Authority Meter Matters App](https://www.edwardsaquifer.org/groundwater-users/groundwater-use-reporting/meter-app/) -- real-world agricultural meter reading app with submission workflow and usage tracking against annual limits
- [WaterVize Allocation Software](https://www.watervize.com/platform-allocations/) -- flexible water allocation tracking for irrigation districts
- [Anyline Mobile Meter Reading](https://anyline.com/news/water-meter-reading) -- GPS location tagging, offline reading, photo verification patterns
- [Axonator Meter Reading App](https://axonator.com/app/water-meter-reading-app/) -- field data collection with offline sync and validation alerts
- [Mapsly Check-in with Geofencing](https://mapsly.com/check-in-check-out-with-geofencing/) -- GPS proximity verification pattern for field workers, distance-based check-in allowing unverified submissions
- [Kansas GMD Association](https://www.gmdausa.org/kansas) -- groundwater management district regulations and reporting requirements
- [Kansas DWR Water Use Reporting](https://www.agriculture.ks.gov/divisions-programs/division-of-water-resources/managing-kansas-water-resources/groundwater-management-districts) -- annual water use reporting requirements (March 1 deadline)
- [WIMAS - Water Information Management and Analysis System](https://hub.kansasgis.org/documents/KU::wimas-water-information-management-and-analysis-system/about) -- Kansas state system (WMIS numbers likely reference this)
- [Black Canyon Irrigation Water Usage Formula](https://blackcanyonirrigation.com/water-usage-formula) -- acre-feet calculation: Number of Acres x Allocation = Total Acre Feet
- [Google Charts Gauge Visualization](https://developers.google.com/chart/interactive/docs/gallery/gauge) -- SVG-based gauge with color ranges reference

---

*Feature landscape researched: 2026-02-19*
*Milestone: Meter Reading, Allocation, and Well Management*
