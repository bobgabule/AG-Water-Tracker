# Phase 14: Record Meter Reading - Research

**Researched:** 2026-02-19
**Domain:** Form-in-bottom-sheet with GPS capture, PowerSync offline writes, tab UI, validation warnings
**Confidence:** HIGH

## Summary

Phase 14 adds a "Record Meter Reading" bottom sheet that opens from the well detail page. The codebase already has every building block needed: Headless UI Dialog for bottom sheets, `useGeolocation` hook for GPS capture, `gps-proximity.ts` for distance calculations, the `readings` table schema in PowerSync, the `usePowerSync()` hook for `db.execute()` writes, and the well detail sheet structure from Phase 13. No new libraries are required.

The main implementation work is: (1) a new `NewReadingSheet` component with two tabs (Reading and Meter Problem), (2) validation logic for positive numbers and the "similar reading" warning, (3) GPS location capture on submit with proximity check, (4) PowerSync `INSERT INTO readings` for the reading tab and `UPDATE wells` for the meter problem tab, and (5) a toast notification system that doesn't exist yet.

**Primary recommendation:** Build this entirely with existing stack libraries. The only new UI pattern is the toast notification (which can be a simple Zustand store + animated component) and the two-tab form within the bottom sheet (manual tab buttons, not a third-party tab library).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Bottom sheet that slides up over the well detail page
- Two tabs: "Reading" (default active) and "Meter Problem" -- single sheet, user switches between
- Header shows "NEW READING" + well name
- Big, prominent numeric input field -- optimized for field entry (sun, gloves)
- Unit and multiplier displayed inline beside (right of) the input text (e.g., "GAL x 10.0")
- No reference to previous reading value shown -- agent reads the meter fresh
- Validation: positive numbers only -- reject zero, negative, and non-numeric with inline error
- Numeric keypad on mobile
- Similar reading warning triggered when value is within 5 units of the last recorded reading
- Warning displayed INSIDE the bottom sheet, replacing the form content (not a separate modal)
- Yellow warning icon + "Similar Reading" header
- Bullet points: "This reading is within 5 gallons of the last recorded reading" / "Double check the meter"
- "Continue" button to proceed and save anyway
- Real-time proximity indicator in the bottom sheet header area (top-right) showing "In Range" / "Out of Range"
- GPS location captured automatically on submit -- stored with the reading
- Out-of-range submission triggers a warning screen inside the sheet (same pattern as similar reading warning)
- Warning shows: "GPS Coordinates Incorrect" / "Are you at the right well?" / "Check your device GPS"
- User CAN continue and submit anyway -- reading gets flagged as out-of-range but is NOT blocked
- Consistent with existing project decision: GPS proximity = display + flag, does NOT block recording
- "Meter Problem" tab with checkboxes: Not Working, Battery Dead, Pump Off, Dead Pump
- Multiple problems can be selected simultaneously (checkboxes, not radio buttons)
- Submitting updates the well's equipment status fields (pump_state, battery_state, meter_status)
- Both tabs (reading and meter problem): close bottom sheet + success toast
- Well detail page updates to reflect the new reading or status change

### Claude's Discretion
- Toast notification design and duration
- Exact bottom sheet height and animation
- Checkbox styling on Meter Problem tab
- Loading/submitting state indicator design
- How to handle GPS unavailable (no permission or no signal)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| READ-01 | User can record a new meter reading via "+ New Reading" button (raw cumulative value) | PowerSync `db.execute()` INSERT pattern from DashboardPage; readings schema already has all columns; `crypto.randomUUID()` for ID generation |
| READ-02 | New reading form displays unit and multiplier (e.g., "GAL x 10.0") | `WellWithReading` type already has `units` and `multiplier` fields; pass from well detail to sheet |
| READ-03 | Reading captures GPS location automatically on submission | `useGeolocation` hook with `requestLocation()` on submit; `gps_latitude`/`gps_longitude`/`is_in_range` columns exist in readings schema |
| READ-04 | Similar reading warning (within 5 units of last reading) with Continue option | `useWellReadings` hook provides sorted readings; compare `parseFloat(value)` against last reading's value; in-sheet warning state replaces form |
| PROB-01 | User can report a meter problem via checkboxes (Not Working, Battery Dead, Pump Off, Dead Pump) | Wells table has `pump_state`, `battery_state`, `meter_status` columns (all TEXT); checkbox UI maps selections to these column values |
| PROB-02 | Problem submission updates well status fields | PowerSync `db.execute()` UPDATE pattern for wells table; connector already handles wells table with normalization |
| PROX-02 | Range status recorded with each reading | `is_in_range` column (INTEGER 0/1) in readings table; `getDistanceToWell()` + `isInRange()` from gps-proximity.ts |
</phase_requirements>

## Standard Stack

### Core (Already Installed -- No New Dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | ^2.2.9 | Dialog/DialogPanel for bottom sheet container | Already used in WellDetailSheet, AddWellFormBottomSheet |
| @powersync/react | ^1.8.2 | `usePowerSync()` for database writes, `useQuery()` for reads | Project's data layer; writes go to local SQLite then sync |
| @powersync/web | ^1.32.0 | `PowerSyncDatabase` type, `db.execute()` for SQL | Used in DashboardPage for INSERT INTO wells |
| @heroicons/react | ^2.2.0 | Icons (ExclamationTriangleIcon for warning, CheckIcon, etc.) | Used throughout the project |
| zustand | ^5.0.11 | Toast notification state store | Already used for activeFarmStore |
| react | ^19.2.0 | Core framework, hooks, memo | Project foundation |
| @turf/distance | ^7.3.4 | Haversine distance (via gps-proximity.ts) | Already used for proximity calculations |

### Supporting (No Additional Libraries Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-swipeable | ^7.0.2 | Swipe-down to dismiss bottom sheet (if needed) | Already in WellDetailSheet; optional for new reading sheet |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual tab buttons | @headlessui/react Tab component | Tab component is available but overkill for 2 tabs; simple state toggle is simpler and matches existing patterns |
| Zustand toast store | react-hot-toast library | Would add a dependency; Zustand store + simple component is consistent with project philosophy |
| HTML `inputMode="decimal"` | Native `<input type="number">` | `type="number"` has browser inconsistencies with step/validation; `inputMode="decimal"` gives numeric keypad without browser validation quirks |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    NewReadingSheet.tsx         # Main bottom sheet with Reading + Meter Problem tabs
    ReadingForm.tsx             # Reading tab content (input, unit display, submit)
    MeterProblemForm.tsx        # Meter Problem tab content (checkboxes, submit)
    SimilarReadingWarning.tsx   # In-sheet warning for similar reading values
    OutOfRangeWarning.tsx       # In-sheet warning for GPS out-of-range
    Toast.tsx                   # Toast notification component (renders from store)
  stores/
    toastStore.ts              # Zustand store for toast notifications
```

### Pattern 1: Bottom Sheet with Headless UI Dialog
**What:** Reuse the exact same Dialog/DialogPanel pattern from `AddWellFormBottomSheet.tsx`
**When to use:** All form bottom sheets in this project
**Example:**
```typescript
// Source: src/components/AddWellFormBottomSheet.tsx (existing codebase)
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';

<Dialog open={open} onClose={onClose} className="relative z-50">
  <DialogBackdrop
    transition
    className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
  />
  <div className="fixed inset-0 flex items-end">
    <DialogPanel
      transition
      className="w-full bg-[#5f7248] shadow-xl transition duration-300 ease-out
        data-[closed]:translate-y-full max-h-[90vh] flex flex-col"
    >
      {/* Header + tabs + content + footer */}
    </DialogPanel>
  </div>
</Dialog>
```

### Pattern 2: PowerSync Local Write (INSERT reading)
**What:** Use `db.execute()` from `usePowerSync()` with parameterized SQL
**When to use:** Any local-first write that needs to sync
**Example:**
```typescript
// Source: src/pages/DashboardPage.tsx (existing pattern for well creation)
const db = usePowerSync();

const readingId = crypto.randomUUID();
const now = new Date().toISOString();

await db.execute(
  `INSERT INTO readings (
    id, well_id, farm_id, value, recorded_by, recorded_at,
    gps_latitude, gps_longitude, is_in_range, notes,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    readingId, wellId, farmId, valueString, userId, now,
    gpsLat, gpsLng, inRange ? 1 : 0, null,
    now, now,
  ]
);
```

### Pattern 3: PowerSync Local Write (UPDATE well equipment status)
**What:** Use `db.execute()` for updating well status fields from meter problem form
**When to use:** When the meter problem tab submits
**Example:**
```typescript
// Derived from existing connector patterns
await db.execute(
  `UPDATE wells SET
    pump_state = ?, battery_state = ?, meter_status = ?, updated_at = ?
  WHERE id = ?`,
  [pumpState, batteryState, meterStatus, new Date().toISOString(), wellId]
);
```

### Pattern 4: In-Sheet Warning State Machine
**What:** Use a state variable to control which "view" is shown inside the bottom sheet: form, similar-reading-warning, out-of-range-warning, or submitting
**When to use:** When validation produces warnings that need user acknowledgment before proceeding
**Example:**
```typescript
type SheetView = 'form' | 'similar-warning' | 'range-warning' | 'submitting';
const [view, setView] = useState<SheetView>('form');

// On submit:
// 1. Validate positive number -> inline error (stays in 'form' view)
// 2. Check similar reading -> setView('similar-warning')
// 3. User clicks "Continue" from similar warning -> capture GPS -> check proximity
// 4. If out of range -> setView('range-warning')
// 5. User clicks "Continue" from range warning -> save with is_in_range=0
// 6. If in range -> save directly with is_in_range=1
```

### Pattern 5: Tab Switching (Simple State)
**What:** Two-tab UI with a string state variable, not a library
**When to use:** When there are 2-3 tabs with distinct content
**Example:**
```typescript
type ActiveTab = 'reading' | 'problem';
const [activeTab, setActiveTab] = useState<ActiveTab>('reading');

// Tab buttons in the header area:
<div className="flex gap-1 px-4">
  <button
    onClick={() => setActiveTab('reading')}
    className={activeTab === 'reading' ? 'bg-white/20 font-semibold' : 'text-white/60'}
  >
    Reading
  </button>
  <button
    onClick={() => setActiveTab('problem')}
    className={activeTab === 'problem' ? 'bg-white/20 font-semibold' : 'text-white/60'}
  >
    Meter Problem
  </button>
</div>

// Conditional content:
{activeTab === 'reading' ? <ReadingForm ... /> : <MeterProblemForm ... />}
```

### Pattern 6: Toast Store (Zustand)
**What:** Minimal Zustand store for showing/hiding toast messages
**When to use:** Global feedback after actions (e.g., "Reading saved")
**Example:**
```typescript
// src/stores/toastStore.ts
import { create } from 'zustand';

interface ToastState {
  message: string | null;
  type: 'success' | 'error';
  show: (message: string, type?: 'success' | 'error') => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'success',
  show: (message, type = 'success') => {
    set({ message, type });
    setTimeout(() => set({ message: null }), 3000);
  },
  hide: () => set({ message: null }),
}));
```

### Anti-Patterns to Avoid
- **Don't use `type="number"` for the reading input:** Browser implementations vary; some add spinner buttons, some block decimal input. Use `inputMode="decimal"` with `type="text"` for consistent numeric keypad + full control over validation.
- **Don't block submission on GPS failure:** User context says GPS is "display + flag, does NOT block recording." If GPS is unavailable, still allow submission with `gps_latitude = null, gps_longitude = null, is_in_range = 0`.
- **Don't use a nested Dialog for warnings:** The similar-reading and out-of-range warnings replace the form content INSIDE the existing sheet (state-driven content swap), not a separate modal.
- **Don't write `is_in_range` as a boolean:** PowerSync doesn't support BOOLEAN -- use INTEGER `0` or `1`. The connector's `normalizeForSupabase()` already converts `is_in_range` to `Boolean()` for Supabase upload.
- **Don't forget `farm_id` on the readings insert:** The readings table has a denormalized `farm_id` column for PowerSync sync rule filtering (Phase 12 decision). Omitting it breaks sync.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Browser-native, used in DashboardPage well creation |
| Distance calculation | Manual Haversine formula | `getDistanceToWell()` from `gps-proximity.ts` | Already implemented with @turf/distance |
| Range check | Custom threshold logic | `isInRange()` from `gps-proximity.ts` | Centralized 500ft threshold |
| Boolean-to-integer conversion | Inline ternary everywhere | Consistent `boolValue ? 1 : 0` pattern | PowerSync requires 0/1 integers, connector normalizes back |
| Bottom sheet animation | Custom CSS transitions | `DialogPanel` with `transition` + `data-[closed]:translate-y-full` | Headless UI v2 built-in transitions |

**Key insight:** This phase is primarily UI assembly -- connecting existing data hooks and write patterns to a new form. Almost zero new infrastructure is needed.

## Common Pitfalls

### Pitfall 1: Forgetting `farm_id` in Readings INSERT
**What goes wrong:** Reading gets created locally in PowerSync but never syncs because sync rules filter by `farm_id`
**Why it happens:** The original `readings` table schema didn't have `farm_id`; it was added as a denormalized column in Phase 12 specifically for sync rule filtering
**How to avoid:** Always include `farm_id` in the INSERT statement. Get it from `onboardingStatus?.farmId` via `useAuth()`
**Warning signs:** Reading appears in local UI but disappears after sync or never shows on other devices

### Pitfall 2: Storing Reading Value as Number Instead of TEXT
**What goes wrong:** Decimal precision loss (e.g., "100.50" becomes "100.5")
**Why it happens:** Natural instinct to use `REAL` for numeric values
**How to avoid:** The `value` column in the readings table is `column.text` in the PowerSync schema. Store the user's input string directly (after validation). The v2.0 decision explicitly says "Meter values stored as TEXT to preserve decimal precision."
**Warning signs:** Values display differently from what was entered

### Pitfall 3: GPS Location Race Condition on Submit
**What goes wrong:** User taps "Submit" but GPS hasn't finished acquiring position; reading saves with null GPS
**Why it happens:** `getCurrentPosition()` is async and takes 1-5 seconds
**How to avoid:** Capture GPS as part of the submit flow: show a "Saving..." state, await GPS result (with timeout), then save. If GPS fails/times out, save anyway with null coordinates and `is_in_range = 0`
**Warning signs:** Readings consistently have null GPS despite user being at the well

### Pitfall 4: Similar Reading Check Against Empty Readings Array
**What goes wrong:** App crashes or warning never triggers because there are no previous readings
**Why it happens:** Array index access on empty array returns `undefined`
**How to avoid:** Guard: `if (readings.length > 0) { const lastReading = readings[0]; ... }`
**Warning signs:** TypeError on first reading for a well, or similar-reading logic silently fails

### Pitfall 5: Meter Problem Checkbox-to-Status Mapping Confusion
**What goes wrong:** Checkbox labels don't map cleanly to the existing well status field values
**Why it happens:** The well has 3 status fields (`pump_state`, `battery_state`, `meter_status`) each with values 'Ok' | 'Low' | 'Critical' | 'Dead' | 'Unknown', but the user-facing checkboxes are: "Not Working", "Battery Dead", "Pump Off", "Dead Pump"
**How to avoid:** Define a clear mapping:
- "Not Working" -> `meter_status: 'Dead'`
- "Battery Dead" -> `battery_state: 'Dead'`
- "Pump Off" -> `pump_state: 'Dead'`
- "Dead Pump" -> `pump_state: 'Dead'`
Note: "Pump Off" and "Dead Pump" may both map to `pump_state`. Clarify in planning: "Pump Off" could be `pump_state: 'Critical'` (temporary) vs "Dead Pump" = `pump_state: 'Dead'` (permanent), or collapse them into one mapping. The existing `WellStatusIndicators` component uses `getStatusConfig()` which handles 'Ok', 'Low', 'Critical', 'Dead', 'Unknown'.
**Warning signs:** Status indicators show unexpected values after meter problem submission

### Pitfall 6: z-index Conflicts Between Stacked Bottom Sheets
**What goes wrong:** NewReadingSheet appears behind or overlapping with WellDetailSheet incorrectly
**Why it happens:** Both use `z-50` by default; the new sheet must layer above the well detail sheet
**How to avoid:** Use `z-[60]` or similar for the NewReadingSheet since WellDetailSheet uses `z-50`. Alternatively, manage a single sheet state in the WellDetailPage that swaps between detail view and reading form.
**Warning signs:** Visual glitches when opening/closing the reading form, backdrop appears wrong

## Code Examples

### Example 1: Reading INSERT with GPS Capture
```typescript
// Pattern for saving a reading to PowerSync (local-first)
const db = usePowerSync();
const { user, onboardingStatus } = useAuth();

const handleSaveReading = useCallback(async (
  wellId: string,
  value: string,        // validated positive number as string (TEXT column)
  gpsLocation: { lat: number; lng: number } | null,
  wellLocation: { latitude: number; longitude: number } | null,
) => {
  const farmId = onboardingStatus?.farmId;
  if (!farmId || !user) return;

  const readingId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Calculate proximity if both GPS and well location available
  let inRange = 0; // Default: out of range or unknown
  if (gpsLocation && wellLocation) {
    const dist = getDistanceToWell(
      { lat: gpsLocation.lat, lng: gpsLocation.lng },
      { latitude: wellLocation.latitude, longitude: wellLocation.longitude },
    );
    inRange = isInRange(dist) ? 1 : 0;
  }

  await db.execute(
    `INSERT INTO readings (
      id, well_id, farm_id, value, recorded_by, recorded_at,
      gps_latitude, gps_longitude, is_in_range, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      readingId,
      wellId,
      farmId,
      value,                          // TEXT -- preserve exactly as entered
      user.id,
      now,
      gpsLocation?.lat ?? null,
      gpsLocation?.lng ?? null,
      inRange,                        // INTEGER 0/1
      null,                           // notes (not in this phase)
      now,
      now,
    ]
  );
}, [db, user, onboardingStatus?.farmId]);
```

### Example 2: Similar Reading Check
```typescript
// Get last reading value for comparison (readings are sorted DESC by recorded_at)
const { readings: existingReadings } = useWellReadings(wellId);

function isSimilarReading(newValue: string): boolean {
  if (existingReadings.length === 0) return false;
  const lastValue = parseFloat(existingReadings[0].value);
  const newValueNum = parseFloat(newValue);
  if (isNaN(lastValue) || isNaN(newValueNum)) return false;
  return Math.abs(newValueNum - lastValue) <= 5;
}
```

### Example 3: Meter Problem UPDATE
```typescript
// Map checkbox selections to well status field updates
interface MeterProblemState {
  notWorking: boolean;
  batteryDead: boolean;
  pumpOff: boolean;
  deadPump: boolean;
}

async function submitMeterProblem(
  db: PowerSyncDatabase,
  wellId: string,
  problems: MeterProblemState,
) {
  const now = new Date().toISOString();

  // Only update fields that have a problem selected
  // Start with current values, override with problem selections
  const updates: Record<string, string> = {};

  if (problems.notWorking) updates.meter_status = 'Dead';
  if (problems.batteryDead) updates.battery_state = 'Dead';
  if (problems.pumpOff) updates.pump_state = 'Critical';   // "Off" = temporary
  if (problems.deadPump) updates.pump_state = 'Dead';       // "Dead" = permanent

  if (Object.keys(updates).length === 0) return;

  // Build dynamic SET clause
  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), now, wellId];

  await db.execute(
    `UPDATE wells SET ${setClauses}, updated_at = ? WHERE id = ?`,
    values,
  );
}
```

### Example 4: Numeric Input Validation
```typescript
// Validation for the reading input field
function validateReadingValue(input: string): string | null {
  if (input.trim() === '') return 'Reading value is required';
  const num = parseFloat(input);
  if (isNaN(num)) return 'Please enter a valid number';
  if (num <= 0) return 'Reading must be a positive number';
  return null; // valid
}
```

### Example 5: GPS Capture on Submit with Timeout
```typescript
// Capture GPS at submit time with a timeout fallback
function captureGpsOnSubmit(
  timeoutMs: number = 5000,
): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // GPS error -- resolve null (don't block submission)
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `<input type="number">` | `<input type="text" inputMode="decimal">` | ~2022+ | Better mobile keyboard control without browser validation quirks |
| Boolean columns in PowerSync | INTEGER 0/1 with connector normalization | Phase 12 | Connector `normalizeForSupabase()` handles conversion; schema uses `column.integer` |
| Direct Supabase writes | PowerSync `db.execute()` (local-first) | Phase 12 | Writes are immediate (offline-capable), sync happens automatically |

**Deprecated/outdated:**
- The `API.md` docs reference `meter_value` (NUMERIC) and `gps_verified` (BOOLEAN) columns for readings -- the actual PowerSync schema uses `value` (TEXT) and `is_in_range` (INTEGER 0/1). Always trust `powersync-schema.ts` as the source of truth.

## Open Questions

1. **Meter Problem checkbox-to-status mapping ambiguity**
   - What we know: 4 checkboxes (Not Working, Battery Dead, Pump Off, Dead Pump) need to map to 3 well fields (pump_state, battery_state, meter_status)
   - What's unclear: "Pump Off" and "Dead Pump" both relate to pump_state. Should they use different status values (Critical vs Dead) or is one redundant?
   - Recommendation: Map "Pump Off" to `pump_state: 'Critical'` (temporary/operational issue) and "Dead Pump" to `pump_state: 'Dead'` (permanent failure). This uses the existing status vocabulary from `WellStatusIndicators`. Planner should document this mapping explicitly.

2. **Where does the "+ New Reading" button go?**
   - What we know: Success criteria says "User taps '+ New Reading' on the well detail page." The current WellDetailSheet has no such button.
   - What's unclear: Should it be in the WellDetailSheet's scrollable content, in the header area, or as a floating button at the bottom?
   - Recommendation: Add a fixed footer button (like AddWellFormBottomSheet's footer pattern) at the bottom of the WellDetailSheet. This is the most visible and thumb-accessible location for mobile.

3. **Should the reading form's bottom sheet fully cover the well detail sheet or partially overlay it?**
   - What we know: User says "slides up over the well detail page." The well detail sheet itself is already a full 90vh sheet.
   - What's unclear: Whether the new reading sheet is a second stacked sheet or replaces the content within the existing sheet.
   - Recommendation: Open as a separate Dialog at higher z-index (`z-[60]`), similar to how AddWellFormBottomSheet opens over the dashboard. This keeps the components decoupled and avoids complex state within WellDetailSheet.

4. **GPS availability handling (Claude's discretion)**
   - What we know: GPS may be unavailable (permission denied, no signal, device doesn't support it)
   - What's unclear: What UI feedback to show
   - Recommendation: (a) If GPS permission not granted, show the proximity indicator as "GPS Unavailable" in gray. (b) On submit, attempt GPS capture with 5s timeout. (c) If GPS fails, save with null coordinates and `is_in_range = 0`. (d) Skip the out-of-range warning entirely if GPS is null (can't determine range).

5. **Toast notification duration and design (Claude's discretion)**
   - Recommendation: 3-second auto-dismiss toast at the bottom of the screen (above safe area). Green background for success ("Reading saved" / "Problem reported"). Simple slide-up animation. Zustand store for state management. Dismissible on tap.

## Sources

### Primary (HIGH confidence)
- `src/lib/powersync-schema.ts` -- Readings table schema (value: TEXT, is_in_range: INTEGER)
- `src/pages/DashboardPage.tsx` -- PowerSync write pattern via `db.execute()` with parameterized SQL
- `src/components/AddWellFormBottomSheet.tsx` -- Bottom sheet Dialog pattern with form, footer buttons, validation
- `src/components/WellDetailSheet.tsx` -- Current well detail sheet structure, GPS proximity usage
- `src/hooks/useGeolocation.ts` -- GPS hook with `requestLocation()`, caching, error handling
- `src/lib/gps-proximity.ts` -- `getDistanceToWell()` and `isInRange()` functions
- `src/hooks/useWellReadings.ts` -- Readings query pattern for last reading comparison
- `src/lib/powersync-connector.ts` -- `normalizeForSupabase()` handles `is_in_range` boolean conversion
- `src/lib/permissions.ts` -- `record_reading` action available to all roles (including meter_checker)
- `src/components/WellStatusIndicators.tsx` -- Status values: 'Ok', 'Low', 'Critical', 'Dead', 'Unknown'
- `src/stores/activeFarmStore.ts` -- Zustand store pattern for reference

### Secondary (MEDIUM confidence)
- Headless UI v2 Dialog docs -- `transition` prop, `data-[closed]:` attribute transitions (verified against existing codebase usage)
- `inputMode="decimal"` for mobile numeric keypad -- verified in existing `AddWellFormBottomSheet.tsx` usage of `inputMode="decimal"` for coordinate fields

### Tertiary (LOW confidence)
- None -- all patterns are verified from existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- everything already installed and used in the project
- Architecture: HIGH -- patterns copied from existing components (DashboardPage, AddWellFormBottomSheet, WellDetailSheet)
- Pitfalls: HIGH -- identified from actual schema analysis and code review (e.g., farm_id denormalization, TEXT values, boolean-to-integer)
- Open questions: MEDIUM -- checkbox-to-status mapping needs planner decision; button placement needs design decision

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable -- no library version changes expected)
