# Phase 15: Well Editing & Allocation Management - Research

**Researched:** 2026-02-19
**Domain:** Form editing, CRUD operations, date pickers, usage calculation, cascade delete
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Well Edit Form
- All fields editable: name, serial number, WMIS, coordinates, units, multiplier, equipment status
- Layout matches existing create well form (same field order, segmented controls)
- Units: segmented control (AF, GAL, CF)
- Multiplier: segmented control (0.01, 1, 10, 1000, MG)
- Equipment status: dropdown per item with specific states (e.g., Pump: Running / Off / Dead)
- Coordinates: "Use my location" GPS button + manual lat/lng text fields
- "Send monthly meter reading report" checkbox
- "Allocations -- N Periods" tappable row linking to allocation page (count = number of created allocations, always tappable)
- Allocation count auto-refreshes when returning from allocations page (PowerSync reactivity)
- Unique well name + WMIS validation within same farm
- Unsaved changes trigger "Discard changes?" confirmation on back navigation
- Includes "Delete Well" button -- cascade deletes well + all readings + allocations
- Permissions: anyone with well access can edit and delete
- After save: navigate back to well detail sheet with success toast
- After delete: navigate back to map with success toast

#### Navigation Flow
- Edit button on well detail sheet -> full-page route (detail sheet closes)
- Edit form back -> well detail sheet reopens
- "Allocations -- N Periods" in edit form -> separate full-page allocation page
- Allocation page "Back to Well" -> returns to edit form
- Allocations only accessible through the edit form (not from well detail sheet directly)
- Usage gauge on well detail sheet is purely informational (not tappable)

#### Allocation CRUD
- Allocation page layout: inline form at top + allocation table below (matches screenshots)
- Inline form hidden by default -- appears on "+ Add Allocation" or tapping a table row
- Tap allocation row -> loads that allocation into the inline form for editing
- Form fields: Start Date, End Date, Allocated (AF), Starting Reading (baseline meter value for usage calculation)
- Date picker: month + year scroll wheel only (day auto-set to 1st of month for start, last of month for end)
- No overlapping allocation periods allowed -- validation blocks save
- Delete requires confirmation dialog
- "Close" button hides the inline form (collapses back to list-only view)
- "Save" button persists changes and keeps form visible
- "+ Add Allocation" button at bottom of page

#### Usage Calculation & Override
- Auto-calculated: Used = (latest reading in period - Starting Reading) x multiplier, converted to AF
- Manual override allowed: user can type a Used value that overrides auto-calculation
- Once overridden, stays manual (no reset to auto-calculated)
- "M" indicator shown in allocation table row when Used value is manually overridden
- Well detail sheet's usage gauge shows real Used data from current allocation (auto or manual)

### Claude's Discretion
- Exact dropdown state options for equipment status (Pump, Battery, Meter)
- Form spacing and visual details
- Error handling and loading states
- Month/year picker implementation approach
- Toast message wording

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDIT-01 | Edit well details (name, serial, WMIS, coords, units, multiplier) | Existing `AddWellFormBottomSheet` provides identical form fields and layout; reuse `WellFormData` interface, `SegmentedControl`, GPS handler, coordinate validation; new full-page route `/wells/:id/edit`; PowerSync `UPDATE wells SET ... WHERE id = ?` |
| EDIT-02 | Allocation count with link to allocation management | `useWellAllocations` hook returns allocation array; `allocations.length` provides count; link navigates to `/wells/:id/allocations`; PowerSync reactivity auto-refreshes count |
| EDIT-03 | Update equipment status from edit form | Existing dropdown pattern from `AddWellFormBottomSheet` with `stateOptions` array; fields `battery_state`, `pump_state`, `meter_status` on wells table |
| ALLOC-01 | Create allocation period (start, end, allocated in AF) | PowerSync `INSERT INTO allocations` with `well_id`, `farm_id`, `period_start`, `period_end`, `allocated_af`; farm_id auto-populated by Supabase trigger; schema needs new `starting_reading` column |
| ALLOC-02 | View allocation periods table | `useWellAllocations` hook already returns all allocations ordered by `period_start DESC`; render as table with Start, End, Used (AF), Allocated (AF) columns |
| ALLOC-03 | Edit allocation (dates, used, allocated) | PowerSync `UPDATE allocations SET ... WHERE id = ?`; inline form pre-filled from selected allocation row |
| ALLOC-04 | Delete allocation period | PowerSync `DELETE FROM allocations WHERE id = ?`; confirmation dialog pattern from `ConfirmDeleteMemberDialog` |
| ALLOC-05 | Usage auto-calculated from readings | Query `SELECT value FROM readings WHERE well_id = ? AND recorded_at BETWEEN ? AND ? ORDER BY recorded_at DESC LIMIT 1` to get latest reading in period; usage = (latest_reading - starting_reading) * multiplier, converted to AF |
| ALLOC-06 | Usage manually overridable | `used_af` and `is_manual_override` already on allocations table; update both fields when user types manual value |
</phase_requirements>

## Summary

Phase 15 adds two new full-page routes: a well edit form (`/wells/:id/edit`) and an allocation management page (`/wells/:id/allocations`). The well edit form closely mirrors the existing `AddWellFormBottomSheet` in field layout and controls, but renders as a full-page form instead of a bottom sheet, pre-fills from existing well data, includes unsaved changes protection via React Router v7's `useBlocker`, and adds a "Delete Well" action with cascade delete. The allocation page provides inline CRUD for allocation periods with a month/year date picker, overlapping period validation, usage auto-calculation from readings, and manual override support.

The codebase is well-prepared for this phase. All data models exist (`wells`, `readings`, `allocations` tables in PowerSync schema), the connector already handles `wells`, `readings`, and `allocations` tables for CRUD operations, and hooks (`useWells`, `useWellAllocations`, `useWellReadings`) provide reactive data access. The main new work is: (1) the edit form page component with pre-fill and dirty tracking, (2) uniqueness validation for name/WMIS within farm, (3) the allocation management page with inline form, (4) a month/year date picker component, (5) usage auto-calculation logic, (6) a `starting_reading` column addition to the allocations schema, and (7) cascade delete implementation.

**Primary recommendation:** Build the well edit form as a new page at `/wells/:id/edit` reusing the exact same field layout and `SegmentedControl` from `AddWellFormBottomSheet`. Build the allocation page at `/wells/:id/allocations` with a custom inline form + table layout. Use `react-mobile-picker` for the iOS-style month/year scroll wheel. Use React Router v7's `useBlocker` for unsaved changes protection. Add a new migration for the `starting_reading` column on allocations.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | ^2.2.9 | Confirmation dialogs (delete well, delete allocation) | Already installed; `Dialog` pattern established in `ConfirmDeleteMemberDialog` |
| react-router | ^7.13.0 | Routes, params, navigation, `useBlocker` | Already installed; provides `useBlocker` for unsaved changes protection |
| @powersync/react | ^1.8.2 | Data queries and mutations | Already installed; `useQuery` for reads, `usePowerSync` for writes |
| zustand | ^5.0.11 | Toast store for success/error messages | Already installed; `useToastStore` pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-mobile-picker | ^1.0.1 | iOS-style scroll wheel for month/year selection | New dependency for allocation date picker; lightweight (~5KB), TypeScript support, `wheelMode` prop for desktop |
| @heroicons/react | ^2.2.0 | Icons (back arrow, save check, delete trash, GPS pin) | Already installed; extensive icon set |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-mobile-picker | Hand-built CSS scroll snap wheel | More work, harder to get momentum/snap feel right; library is small enough to justify |
| react-mobile-picker | react-datepicker with showMonthYearPicker | Full calendar library (~40KB) for a simple month/year picker; overkill |
| react-mobile-picker | Native `<input type="month">` | Inconsistent across browsers, no iOS wheel UX, poor Android support |

**Installation:**
```bash
npm install react-mobile-picker
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  pages/
    WellEditPage.tsx           # Full-page well edit form route
    WellAllocationsPage.tsx    # Full-page allocation management route
  components/
    ConfirmDeleteWellDialog.tsx # Delete well confirmation dialog
    ConfirmDeleteAllocationDialog.tsx # Delete allocation confirmation
    MonthYearPicker.tsx        # Reusable month/year scroll wheel picker
    AllocationInlineForm.tsx   # Inline form for create/edit allocation
    AllocationTable.tsx        # Table display of allocation periods
  hooks/
    useWellAllocations.ts      # (exists) Add count query variant
  lib/
    usage-calculation.ts       # Unit conversion + usage calc logic
    validation.ts              # (exists) Add name/WMIS uniqueness
```

### Pattern 1: Full-Page Edit Form with Pre-fill
**What:** A route component that loads existing well data and pre-fills a form matching the create-well layout.
**When to use:** When editing an existing entity that has an established creation form.
**Example:**
```typescript
// Source: Derived from existing AddWellFormBottomSheet pattern
export default function WellEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = usePowerSync();
  const { wells } = useWells();
  const well = wells.find((w) => w.id === id);
  const { allocations } = useWellAllocations(id ?? null);

  // Pre-fill form state from existing well data
  const [name, setName] = useState(well?.name ?? '');
  const [meterSerialNumber, setMeterSerialNumber] = useState(well?.meterSerialNumber ?? '');
  // ... more fields

  // Dirty tracking for unsaved changes
  const isDirty = useMemo(() => {
    if (!well) return false;
    return name !== well.name || meterSerialNumber !== (well.meterSerialNumber ?? '') /* ... */;
  }, [name, meterSerialNumber, /* ... */ well]);

  // Block navigation when dirty
  const blocker = useBlocker(isDirty);

  const handleSave = useCallback(async () => {
    await db.execute(
      `UPDATE wells SET name = ?, meter_serial_number = ?, /* ... */ updated_at = ? WHERE id = ?`,
      [name, meterSerialNumber, /* ... */ new Date().toISOString(), id]
    );
    useToastStore.getState().show('Well updated');
    navigate(`/wells/${id}`);
  }, [/* deps */]);

  // ... render form identical to AddWellFormBottomSheet layout
}
```

### Pattern 2: Inline CRUD Form + Table
**What:** A collapsible inline form above a data table, where tapping a row loads data into the form for editing.
**When to use:** When managing a list of related records (allocations) on a single page.
**Example:**
```typescript
// Allocation management page pattern
const [selectedId, setSelectedId] = useState<string | null>(null);
const [formVisible, setFormVisible] = useState(false);

const handleRowClick = useCallback((allocation: Allocation) => {
  setSelectedId(allocation.id);
  // Pre-fill form fields from allocation
  setFormVisible(true);
}, []);

const handleAddNew = useCallback(() => {
  setSelectedId(null);
  // Reset form fields to defaults
  setFormVisible(true);
}, []);

const handleClose = useCallback(() => {
  setFormVisible(false);
  setSelectedId(null);
}, []);
```

### Pattern 3: PowerSync Cascade Delete
**What:** Delete a well and all related readings/allocations in a single operation.
**When to use:** When the parent entity has dependent child records.
**Example:**
```typescript
// Well deletion -- PowerSync local delete + Supabase CASCADE handles children
const handleDeleteWell = useCallback(async () => {
  // Delete readings and allocations first (PowerSync local), then well
  await db.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM readings WHERE well_id = ?', [wellId]);
    await tx.execute('DELETE FROM allocations WHERE well_id = ?', [wellId]);
    await tx.execute('DELETE FROM wells WHERE id = ?', [wellId]);
  });
  useToastStore.getState().show('Well deleted');
  navigate('/');
}, [db, wellId, navigate]);
```
**Note:** The Supabase schema has `ON DELETE CASCADE` on both `readings.well_id` and `allocations.well_id`, so the server-side cascade handles cleanup. However, PowerSync's local SQLite does NOT enforce foreign key cascades, so we must delete children explicitly in the local transaction to keep the local DB consistent before sync.

### Pattern 4: React Router v7 useBlocker for Unsaved Changes
**What:** Block navigation when form has unsaved changes, showing a confirmation dialog.
**When to use:** Any form page where data loss on accidental navigation is a concern.
**Example:**
```typescript
// Source: https://reactrouter.com/api/hooks/useBlocker
import { useBlocker } from 'react-router';

const isDirty = /* computed from form state vs original */;
const blocker = useBlocker(isDirty);

// In render:
{blocker.state === 'blocked' && (
  <ConfirmDialog
    title="Discard changes?"
    message="You have unsaved changes. Are you sure you want to leave?"
    onConfirm={() => blocker.proceed()}
    onCancel={() => blocker.reset()}
  />
)}
```
**Note:** `useBlocker` handles in-app navigation only. For browser refresh/tab close, also add a `beforeunload` event listener.

### Anti-Patterns to Avoid
- **Reusing AddWellFormBottomSheet directly:** The create form is a Dialog-based bottom sheet; the edit form is a full page route. Don't try to conditionally render the same component as both. Extract shared field layout into a helper or just replicate the layout.
- **Mutating form state from well data on every render:** Only initialize form state once when the component mounts or well data first loads. Don't sync form state to well data reactively or edits will be overwritten.
- **Forgetting to delete children locally in PowerSync:** Supabase CASCADE handles server-side, but PowerSync local SQLite doesn't enforce FK cascades. Always delete readings + allocations before the well in a `writeTransaction`.
- **Storing starting_reading as a number in PowerSync:** All decimal values in this project are stored as TEXT in PowerSync to preserve precision. Follow the existing `value` (readings), `allocated_af`, `used_af` pattern.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Month/year scroll wheel picker | Custom CSS scroll snap with momentum | `react-mobile-picker` | Momentum physics, snap behavior, touch handling, accessibility -- all hard to get right |
| Unsaved changes navigation blocking | Custom history listener + state management | React Router v7 `useBlocker` | Handles edge cases (popstate, replace, push), provides clean state machine |
| Confirmation dialogs | Custom modal from scratch | Headless UI `Dialog` | Already used throughout the project (`ConfirmDeleteMemberDialog` pattern) |
| Cascade delete | Manual sequential delete statements | `db.writeTransaction()` | Ensures atomicity -- if any delete fails, entire transaction rolls back |
| Decimal precision for AF values | `parseFloat()` everywhere | TEXT storage + `parseFloat()` only at display | Prevents floating point drift during sync; matches existing project convention |

**Key insight:** The biggest complexity in this phase is NOT the form UI (which closely mirrors the existing create form) -- it's the allocation management page with its inline form, date picker, overlapping period validation, usage calculation, and manual override tracking. Budget time accordingly.

## Common Pitfalls

### Pitfall 1: Form State Initialization Race Condition
**What goes wrong:** Well data from `useWells()` may not be immediately available when the component mounts (PowerSync query takes a tick). Setting initial form state from `undefined` data leads to empty fields that don't update when data arrives.
**Why it happens:** `useQuery` returns empty data on first render, then populates reactively.
**How to avoid:** Use a `useEffect` that initializes form state once when well data first becomes available, using a ref to track whether initialization has occurred.
**Warning signs:** Form fields briefly flash empty, or saved data doesn't match what was displayed.

### Pitfall 2: PowerSync Local Cascade Delete
**What goes wrong:** Deleting a well without first deleting its readings/allocations locally leaves orphaned rows in PowerSync's local SQLite. These orphans can cause sync errors or stale UI data.
**Why it happens:** PowerSync's local SQLite does NOT enforce `ON DELETE CASCADE` foreign keys. Only Supabase's PostgreSQL does.
**How to avoid:** Always use `db.writeTransaction()` to delete children first, then the well. The Supabase-side CASCADE will also fire, but local cleanup prevents sync issues.
**Warning signs:** Readings or allocations still visible in UI after well deletion; sync errors in console.

### Pitfall 3: Overlapping Allocation Period Validation
**What goes wrong:** Users create two allocation periods with overlapping date ranges (e.g., Jan-Jun 2026 and Mar-Dec 2026), causing double-counted usage.
**Why it happens:** No database-level constraint prevents overlapping periods for the same well.
**How to avoid:** Validate before save: query existing allocations for the well, check if new/edited period overlaps any existing period (excluding the current one if editing).
**Warning signs:** Total usage exceeds allocated across all periods; confusing usage gauge values.

### Pitfall 4: Starting Reading Column Missing from Schema
**What goes wrong:** The CONTEXT decisions specify "Starting Reading" as a form field for allocations, but the current `allocations` table has no `starting_reading` column.
**Why it happens:** The allocation schema was created in migration 031 with `used_af` and `is_manual_override` but no baseline reading field.
**How to avoid:** Create a new migration (032) that adds `starting_reading TEXT` to the `allocations` table. Update the PowerSync schema to include the new column. The column stores the baseline meter value as TEXT (matching the readings.value pattern).
**Warning signs:** Cannot save starting reading; field has nowhere to persist.

### Pitfall 5: Unit Conversion Complexity in Usage Calculation
**What goes wrong:** Usage calculation must convert from raw meter units to AF. The multiplier and units fields determine the conversion factor, and getting this wrong leads to wildly incorrect usage values.
**Why it happens:** The formula `(latest_reading - starting_reading) * multiplier` gives a value in the well's native units. This must then be converted to AF for storage and display.
**How to avoid:** Build a dedicated `calculateUsageAf()` function that takes raw reading values, multiplier, and units, then converts to AF. Unit conversion factors: 1 AF = 325,851 gallons, 1 AF = 43,560 cubic feet. MG multiplier = 1,000,000 (million gallons).
**Warning signs:** Usage values orders of magnitude too large or too small.

### Pitfall 6: useBlocker + Dialog Interaction
**What goes wrong:** `useBlocker` fires when navigating to the allocations sub-page from the edit form. The blocker treats it as "leaving the page" even though the user intends to navigate to a related page.
**Why it happens:** `useBlocker` blocks ALL navigation, including intentional navigation to the allocations page.
**How to avoid:** Either (1) temporarily disable the blocker before navigating to allocations (set a flag), or (2) use the blocker's `nextLocation` to whitelist `/wells/:id/allocations` as an allowed destination, or (3) save form state to a Zustand store before navigating so no data is lost.
**Warning signs:** Blocker dialog appears when tapping "Allocations" link; user confusion.

## Code Examples

### Well Update via PowerSync
```typescript
// Source: Derived from DashboardPage handleSaveWell pattern
const handleSave = useCallback(async () => {
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE wells SET
      name = ?, meter_serial_number = ?, wmis_number = ?,
      latitude = ?, longitude = ?,
      units = ?, multiplier = ?,
      send_monthly_report = ?,
      battery_state = ?, pump_state = ?, meter_status = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      name, meterSerialNumber, wmisNumber,
      latitude, longitude,
      units, multiplier,
      sendMonthlyReport ? 1 : 0,
      batteryState, pumpState, meterStatus,
      now, wellId,
    ]
  );
}, [/* all field deps */]);
```

### Allocation Create via PowerSync
```typescript
// Source: Derived from NewReadingSheet saveReading pattern
const handleSaveAllocation = useCallback(async () => {
  const allocationId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO allocations (
      id, well_id, farm_id, period_start, period_end,
      allocated_af, used_af, is_manual_override, starting_reading,
      notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      allocationId, wellId, farmId,
      periodStart, periodEnd,
      allocatedAf, '0', 0, startingReading,
      null, now, now,
    ]
  );
}, [/* deps */]);
```

### Overlapping Period Validation
```typescript
// Check if a new/edited period overlaps existing allocations for the same well
function hasOverlap(
  allocations: Allocation[],
  start: string,
  end: string,
  excludeId?: string,
): boolean {
  return allocations
    .filter((a) => a.id !== excludeId)
    .some((a) => a.periodStart < end && a.periodEnd > start);
}
```

### Usage Auto-Calculation
```typescript
// Source: Derived from v2.0 decision: Used = (latest reading - starting reading) x multiplier, converted to AF
const CONVERSION_TO_AF: Record<string, number> = {
  AF: 1,
  GAL: 1 / 325851,
  CF: 1 / 43560,
};

function getMultiplierValue(multiplier: string): number {
  if (multiplier === 'MG') return 1_000_000;
  return parseFloat(multiplier) || 1;
}

function calculateUsageAf(
  latestReading: string,
  startingReading: string,
  multiplier: string,
  units: string,
): number {
  const latest = parseFloat(latestReading) || 0;
  const starting = parseFloat(startingReading) || 0;
  const diff = latest - starting;
  if (diff <= 0) return 0;
  const rawUsage = diff * getMultiplierValue(multiplier);
  // rawUsage is in the well's native units; convert to AF
  const factor = CONVERSION_TO_AF[units] ?? 1;
  return rawUsage * factor;
}
```

### Month/Year Picker with react-mobile-picker
```typescript
// Recommended approach for month/year scroll wheel
import Picker from 'react-mobile-picker';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const YEARS = Array.from({ length: 20 }, (_, i) => String(2020 + i));

interface MonthYearPickerProps {
  month: string; // '01' - '12'
  year: string;  // '2024'
  onChange: (month: string, year: string) => void;
}

function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const monthIndex = parseInt(month, 10) - 1;
  const [value, setValue] = useState({
    month: MONTHS[monthIndex] || 'Jan',
    year: year,
  });

  const handleChange = (newValue: { month: string; year: string }) => {
    setValue(newValue);
    const monthNum = String(MONTHS.indexOf(newValue.month) + 1).padStart(2, '0');
    onChange(monthNum, newValue.year);
  };

  return (
    <Picker value={value} onChange={handleChange} wheelMode="natural">
      <Picker.Column name="month">
        {MONTHS.map((m) => (
          <Picker.Item key={m} value={m}>{m}</Picker.Item>
        ))}
      </Picker.Column>
      <Picker.Column name="year">
        {YEARS.map((y) => (
          <Picker.Item key={y} value={y}>{y}</Picker.Item>
        ))}
      </Picker.Column>
    </Picker>
  );
}
```

### Cascade Delete in WriteTransaction
```typescript
// Source: PowerSync writeTransaction ensures atomicity
const handleDeleteWell = useCallback(async () => {
  await db.writeTransaction(async (tx) => {
    await tx.execute('DELETE FROM readings WHERE well_id = ?', [wellId]);
    await tx.execute('DELETE FROM allocations WHERE well_id = ?', [wellId]);
    await tx.execute('DELETE FROM wells WHERE id = ?', [wellId]);
  });
  useToastStore.getState().show('Well deleted');
  navigate('/');
}, [db, wellId, navigate]);
```

### Confirmation Dialog (reuse existing pattern)
```typescript
// Source: ConfirmDeleteMemberDialog pattern
<Dialog open={showDeleteConfirm} onClose={handleCancelDelete} className="relative z-50">
  <DialogBackdrop
    transition
    className="fixed inset-0 bg-black/50 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
  />
  <div className="fixed inset-0 flex items-center justify-center p-4">
    <DialogPanel
      transition
      className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-xl transition duration-300 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
    >
      {/* Warning icon, title, message, Cancel + Delete buttons */}
    </DialogPanel>
  </div>
</Dialog>
```

## Schema Changes Required

### New Migration: Add `starting_reading` to allocations
The CONTEXT decisions specify a "Starting Reading" field for allocations that serves as the baseline meter value for usage calculation. This column does not exist in the current schema.

```sql
-- Migration 032: Add starting_reading to allocations
ALTER TABLE allocations ADD COLUMN starting_reading NUMERIC(15,2);
COMMENT ON COLUMN allocations.starting_reading IS 'Baseline meter reading value for usage calculation within this allocation period';
```

### PowerSync Schema Update
Add `starting_reading` to the allocations table in `src/lib/powersync-schema.ts`:
```typescript
const allocations = new TableV2({
  // ... existing columns ...
  starting_reading: column.text, // TEXT preserves decimal precision (matches readings.value pattern)
});
```

### RLS Policy Consideration
The existing RLS policies on `wells` restrict UPDATE and DELETE to `get_user_admin_farm_ids()` (grower/admin only). The CONTEXT decision says "anyone with well access can edit and delete." This means either:
1. The RLS policies need updating to use `get_user_farm_ids()` instead of `get_user_admin_farm_ids()` for UPDATE/DELETE on wells, OR
2. The client-side permission check is relaxed but the server-side still restricts (which would cause sync failures for meter_checkers).

**Recommendation:** Update the wells RLS policies for UPDATE and DELETE to use `get_user_farm_ids()` in a new migration, matching the user's decision that anyone with well access can edit and delete. This aligns with allocations RLS which already uses `get_user_farm_ids()` for all operations.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `usePrompt` (React Router v5) | `useBlocker` (React Router v6.19+/v7) | React Router v6.19.0 | Stable API; function-based blocker with state machine; replaces deprecated `usePrompt` |
| Calendar date pickers for mobile | Scroll wheel pickers | 2023+ trend | Better mobile UX; mimics native iOS/Android date selection; less screen space |
| Separate form pages for CRUD | Inline forms within table pages | Modern pattern | Reduces navigation; keeps context visible; common in admin/management UIs |
| `window.confirm()` for blocking | Custom Dialog with `useBlocker` | React Router v6.19+ | Native `confirm()` blocks rendering; custom dialogs are non-blocking and match app styling |

**Deprecated/outdated:**
- `usePrompt`: Removed from React Router v6; replaced by `useBlocker`
- Native `<input type="month">`: Inconsistent browser support, especially on iOS Safari
- `react-router-prompt`: Third-party wrapper; unnecessary now that `useBlocker` is stable in v7

## Open Questions

1. **Well name + WMIS uniqueness validation approach**
   - What we know: Validation must check uniqueness within the same farm. PowerSync local DB has all farm wells.
   - What's unclear: Whether to query PowerSync locally (fast, works offline) or Supabase (authoritative but requires network).
   - Recommendation: Query PowerSync locally (`SELECT id FROM wells WHERE farm_id = ? AND (name = ? OR wmis_number = ?) AND id != ?`). This works offline and is consistent with how the app operates. Edge case of two users creating same-named wells offline will be caught by sync.

2. **Equipment status dropdown values**
   - What we know: The CONTEXT says "dropdown per item with specific states (e.g., Pump: Running / Off / Dead)". The existing codebase uses `['Ok', 'Low', 'Critical', 'Dead', 'Unknown']` for all three equipment types.
   - What's unclear: Whether the user wants different state options per equipment type (e.g., Pump-specific: "Running/Off/Dead") or the same states for all.
   - Recommendation: Keep the existing `['Ok', 'Low', 'Critical', 'Dead', 'Unknown']` for all three types since the schema, status indicators, and meter problem tab all use these values consistently. The CONTEXT lists this as "Claude's Discretion."

3. **react-mobile-picker TypeScript types**
   - What we know: The library exists on npm and has been updated relatively recently.
   - What's unclear: Whether it ships with TypeScript declarations or needs `@types/react-mobile-picker`.
   - Recommendation: Check at install time. If no types, either use `// @ts-ignore` or create a minimal `.d.ts` declaration file. Alternatively, build a simple custom month/year picker using CSS scroll snap if the library has issues.

4. **Saving form state when navigating to allocations page**
   - What we know: User navigates from edit form to allocations page and back. Form should retain unsaved changes.
   - What's unclear: Whether to persist draft state in a Zustand store, URL search params, or rely on React component state (which would be lost on unmount).
   - Recommendation: Use a Zustand store (`wellEditDraftStore`) to persist unsaved form state keyed by well ID. Clear the store after successful save or intentional discard. This ensures form state survives the round-trip to the allocations page.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/AddWellFormBottomSheet.tsx` -- existing create well form layout, field order, SegmentedControl usage, GPS handler, coordinate validation
- Codebase analysis: `src/components/WellDetailSheet.tsx` -- well detail sheet with edit button wiring, allocation display
- Codebase analysis: `src/pages/WellDetailPage.tsx` -- existing route at `/wells/:id` with `handleEdit` navigating to `/wells/${id}/edit`
- Codebase analysis: `src/lib/powersync-schema.ts` -- wells, readings, allocations table definitions with column types
- Codebase analysis: `src/lib/powersync-connector.ts` -- CRUD operation handling, boolean normalization, table whitelist
- Codebase analysis: `src/hooks/useWellAllocations.ts` -- allocation query hook, mapped Allocation interface
- Codebase analysis: `src/hooks/useWellReadings.ts` -- readings query hook
- Codebase analysis: `supabase/migrations/031_create_readings_and_allocations.sql` -- allocations schema with `ON DELETE CASCADE`, farm_id trigger, RLS policies
- Codebase analysis: `supabase/migrations/017_create_wells_table.sql` -- wells schema with `ON DELETE CASCADE`, RLS policies restricting UPDATE/DELETE to admin
- Codebase analysis: `src/lib/permissions.ts` -- role/permission matrix
- Codebase analysis: `src/stores/toastStore.ts` -- toast pattern for success/error messages
- Codebase analysis: `src/components/ConfirmDeleteMemberDialog.tsx` -- confirmation dialog pattern with Headless UI Dialog

### Secondary (MEDIUM confidence)
- [React Router v7 useBlocker API](https://reactrouter.com/api/hooks/useBlocker) -- stable hook for navigation blocking with `proceed()`/`reset()` state machine
- [React Router Navigation Blocking How-to](https://reactrouter.com/how-to/navigation-blocking) -- complete example with beforeunload integration
- [react-mobile-picker npm](https://www.npmjs.com/package/react-mobile-picker) -- iOS-style scroll wheel picker, `wheelMode` for desktop, `Picker.Column`/`Picker.Item` API

### Tertiary (LOW confidence)
- Unit conversion factors (1 AF = 325,851 gallons, 1 AF = 43,560 cubic feet) -- standard water measurement conversions; should be verified against local/state standards the app targets

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all core libraries already in project; only new dependency is react-mobile-picker
- Architecture: HIGH - patterns mirror existing codebase components (create well form, readings sheet, delete dialog)
- Pitfalls: HIGH - identified from direct codebase analysis (PowerSync cascade, schema gaps, form state management)
- Usage calculation: MEDIUM - conversion factors are standard but MG multiplier handling and edge cases need testing
- react-mobile-picker: MEDIUM - TypeScript support and exact API need validation at install time

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, no fast-moving dependencies)
