# Phase 13: Well Detail Page - Research

**Researched:** 2026-02-19
**Domain:** Mobile bottom sheet UI, swipe gestures, data visualization
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
#### Sheet behavior
- Sheet covers ~90% of the viewport, leaving a sliver of map visible at the top (peek)
- Semi-transparent dark overlay (scrim) between the sheet and the map
- Tapping the overlay does NOT dismiss the sheet (prevents accidental dismissal)
- Dismiss via swipe-down gesture + visible back button at the top of the sheet
- No drag handle bar — the back button provides the visual affordance
- Internal scrolling — sheet stays fixed at 90%, content scrolls within it, header stays pinned at top
- Smooth ~350ms ease-in animation when the sheet slides up

#### Well-to-well navigation
- Swipe left/right to cycle between wells without dismissing the sheet
- Wells ordered by geographic proximity to the currently viewed well
- No position indicator (dots or counter) — just the well name changes, keeping it minimal

### Claude's Discretion
- Whether the map pans to center on the new well when swiping between wells
- Transition style between wells (horizontal slide vs cross-fade)
- Well info header layout and information hierarchy
- Usage gauge visual design (bar, ring, colors, thresholds)
- Readings history table/card layout and density
- Empty state illustrations and messaging
- Status indicator icon and color design
- Edit button placement and style

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WELL-01 | User can tap a well marker on the map to open a full-page slide-up sheet (map stays loaded behind) | Headless UI Dialog + `data-[closed]:translate-y-full` pattern already used in codebase; DashboardPage already has `onWellClick` navigating to `/wells/:id`; need route + sheet component |
| WELL-02 | Well detail sheet shows farm name, well name, serial number, WMIS #, and "Last Updated" timestamp | All fields available from `useWells` hook (`WellWithReading` type); farm name from `useAuth().onboardingStatus.farmName` |
| WELL-03 | Well detail sheet shows a visual usage gauge bar with Allocated / Used / Remaining for current allocation | `useWellAllocations` hook returns allocations with `allocatedAf`, `usedAf`; remaining = allocated - used; pure CSS horizontal bar gauge |
| WELL-04 | Well detail sheet shows status indicators (Pump, Battery, Meter Status) with check/X icons | Fields `batteryState`, `pumpState`, `meterStatus` on `WellWithReading`; values are `Ok\|Low\|Critical\|Dead\|Unknown`; map to check/X/warning icons |
| WELL-05 | Well detail sheet shows scrollable readings history (Date, Value, User, Time) | `useWellReadings` returns readings ordered by `recorded_at DESC`; `recordedBy` is a user ID — need JOIN or lookup against `farm_members.full_name` |
| WELL-06 | Out-of-range readings marked with yellow indicator in readings list | `Reading.isInRange` boolean available from hook; render yellow badge/dot when `false` |
| WELL-07 | "Missing Allocation" message when well has no allocation periods | Conditional render when `allocations.length === 0` |
| WELL-08 | Back button dismisses the sheet, returning to interactive map | Navigate back (`navigate(-1)` or `navigate('/')`) closing the sheet |
| WELL-09 | Edit button navigates to well edit form | Navigate to `/wells/:id/edit` (edit form is a separate phase, just wire the route) |
| READ-07 | "No readings" empty state message when well has no readings | Conditional render when `readings.length === 0` |
| PROX-01 | "In Range / Out of Range" GPS indicator | Use existing `getDistanceToWell` + `isInRange` from `src/lib/gps-proximity.ts` with `useGeolocation` for user coords |
</phase_requirements>

## Summary

Phase 13 creates a full-page slide-up sheet that displays well details when a user taps a well marker on the map. The sheet covers ~90% of the viewport with a scrim overlay, supports swipe-down dismiss and swipe-left/right well-to-well navigation, and shows well header info, a usage gauge, status indicators, and scrollable readings history.

The codebase already has all the data hooks needed (`useWells`, `useWellReadings`, `useWellAllocations`, `useGeolocation`, `gps-proximity.ts`), the Headless UI v2 Dialog + `data-[closed]:translate-y-full` slide-up pattern is used by `AddWellFormBottomSheet`, and both `DashboardPage` and `WellListPage` already navigate to `/wells/:id`. The main new work is: (1) a new route for `/wells/:id`, (2) the sheet component with gesture support, (3) the content sections (header, gauge, status indicators, readings list), and (4) well-to-well swipe navigation with geographic proximity ordering.

**Primary recommendation:** Build the well detail sheet as a new page component at `/wells/:id` that renders a Headless UI Dialog over the map. Use `react-swipeable` (~3.5KB gzipped) for swipe-down dismiss and swipe-left/right navigation. Build the usage gauge as a pure CSS horizontal stacked bar (no charting library needed). Resolve reading user names via a PowerSync JOIN query against `farm_members`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @headlessui/react | ^2.2.9 | Dialog, backdrop, transitions | Already in project; provides accessible modal pattern with `data-[closed]:` transitions |
| react-swipeable | ^7.0.2 | Swipe gesture detection | ~3.5KB gzipped, zero dependencies, provides `useSwipeable` hook for left/right/up/down swipe events |
| @turf/distance | ^7.3.4 | Geographic proximity ordering | Already installed; calculates Haversine distance between well coordinates |
| @heroicons/react | ^2.2.0 | Check/X/warning icons for status | Already installed; `CheckCircleIcon`, `XCircleIcon`, `ExclamationTriangleIcon` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-router | ^7.13.0 | Route params, navigation | Already installed; `useParams` to get well ID, `useNavigate` to go back |
| @powersync/react | ^1.8.2 | Data queries | Already installed; `useQuery` for readings with user name JOIN |
| zustand | ^5.0.11 | Optional: selected well state | Already installed; could store selected well ID if needed across components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-swipeable | Custom touch event hook | Saves ~3.5KB but requires manual delta thresholds, direction detection, edge cases; react-swipeable handles all of this reliably |
| react-swipeable | framer-motion gestures | Much larger bundle (~32KB gzipped); overkill for simple swipe detection |
| CSS horizontal bar gauge | Chart library (recharts, victory) | Chart libraries add 30-100KB; a stacked bar is trivially built with Tailwind CSS |

**Installation:**
```bash
npm install react-swipeable
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── WellDetailPage.tsx        # Route page, loads well + orchestrates
├── components/
│   ├── WellDetailSheet.tsx        # The slide-up sheet container (Dialog + gestures)
│   ├── WellDetailHeader.tsx       # Pinned header: farm name, well name, serial, WMIS, status, back/edit buttons
│   ├── WellUsageGauge.tsx         # Horizontal stacked bar: allocated/used/remaining
│   ├── WellStatusIndicators.tsx   # Pump, Battery, Meter status with check/X icons
│   ├── WellReadingsList.tsx       # Scrollable readings history table
│   └── WellReadingRow.tsx         # Single reading row (date, value, user, time, GPS indicator)
├── hooks/
│   ├── useWellDetail.ts           # Combined hook: well + readings + allocations + farm name for a single well ID
│   └── useWellProximityOrder.ts   # Orders wells by geographic distance from a given well
└── lib/
    └── gps-proximity.ts           # Already exists: getDistanceToWell, isInRange
```

### Pattern 1: Sheet as Overlay Route
**What:** The well detail page is a route (`/wells/:id`) that renders a Dialog overlay on top of the map. The map stays mounted behind the sheet because AppLayout renders the Outlet, and the DashboardPage is replaced by WellDetailPage — but the map can be preserved via React Router's layout nesting or by keeping it in a shared parent.
**When to use:** When you need the map to remain loaded behind the sheet.

**Recommended approach:** Render the sheet as a sibling route to Dashboard within AppLayout. The sheet component itself manages its own map backdrop (or simply uses a dark scrim over the existing content). Since the map is part of DashboardPage and not AppLayout, the simplest approach is:
- Route `/wells/:id` renders `WellDetailPage`
- `WellDetailPage` renders a full-screen sheet that appears to overlay the map
- The map is NOT kept alive behind it (would add complexity); instead, use a dark background that makes the 10% top sliver appear as a peek of dark content
- On dismiss (back button or swipe-down), navigate back to `/` which remounts the map

**Alternative (higher complexity):** Keep the map alive by rendering it in AppLayout or a shared layout route, with the sheet as an overlay. This is more complex and not needed for MVP.

```typescript
// WellDetailPage.tsx — route component
import { useParams, useNavigate } from 'react-router';
import WellDetailSheet from '../components/WellDetailSheet';
import { useWells } from '../hooks/useWells';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { wells } = useWells();

  const handleClose = useCallback(() => navigate('/'), [navigate]);
  const handleEdit = useCallback(() => navigate(`/wells/${id}/edit`), [navigate, id]);

  return (
    <WellDetailSheet
      wellId={id!}
      wells={wells}
      onClose={handleClose}
      onEdit={handleEdit}
    />
  );
}
```

### Pattern 2: Swipe Gesture Handling with react-swipeable
**What:** Use `useSwipeable` to detect swipe-down (dismiss) and swipe-left/right (navigate wells) on the sheet.
**When to use:** For the well detail sheet's gesture interactions.

```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedDown: () => handleClose(),
  onSwipedLeft: () => navigateToNextWell(),
  onSwipedRight: () => navigateToPreviousWell(),
  delta: 50,                    // Minimum 50px swipe to trigger
  preventScrollOnSwipe: false,  // Allow vertical scroll inside content
  trackTouch: true,
  trackMouse: false,
});

// Spread handlers on the sheet's header area (not the scrollable content)
// to avoid conflicting with internal scroll
<div {...handlers} className="...">
  {/* sheet header */}
</div>
```

**Critical nuance:** The swipe-down dismiss handler should be attached to the **header area only**, not the entire sheet. The scrollable content area needs free vertical scroll. Swipe-left/right can be attached to the header or the entire sheet depending on UX preference.

### Pattern 3: Geographic Proximity Ordering
**What:** Sort wells by distance from the currently viewed well using @turf/distance.
**When to use:** For well-to-well navigation order.

```typescript
import distance from '@turf/distance';

function getWellsOrderedByProximity(
  currentWell: WellWithReading,
  allWells: WellWithReading[]
): WellWithReading[] {
  if (!currentWell.location) return allWells;

  return allWells
    .filter(w => w.id !== currentWell.id && w.location !== null)
    .map(w => ({
      well: w,
      dist: distance(
        [currentWell.location!.longitude, currentWell.location!.latitude],
        [w.location!.longitude, w.location!.latitude],
        { units: 'feet' }
      ),
    }))
    .sort((a, b) => a.dist - b.dist)
    .map(item => item.well);
}
```

### Pattern 4: Reading User Name Resolution
**What:** The `recorded_by` field stores a user ID. To show the user's name in the readings list, JOIN against `farm_members` table.
**When to use:** When displaying the readings history with user names.

```typescript
// Enhanced query in useWellReadings or a new hook
const query = wellId
  ? `SELECT r.id, r.well_id, r.value, r.recorded_by, r.recorded_at,
     r.gps_latitude, r.gps_longitude, r.is_in_range, r.notes,
     fm.full_name as recorder_name
     FROM readings r
     LEFT JOIN farm_members fm ON fm.user_id = r.recorded_by
     WHERE r.well_id = ?
     ORDER BY r.recorded_at DESC`
  : 'SELECT NULL WHERE 0';
```

**Note:** `farm_members.full_name` is denormalized from `users.display_name` and is already used in `UsersPage.tsx`. The LEFT JOIN ensures readings still show even if the user record is missing. Since PowerSync uses local SQLite, this JOIN is performant (no network call).

### Pattern 5: CSS-Only Usage Gauge
**What:** A horizontal stacked bar showing allocated, used, and remaining water.
**When to use:** For the WELL-03 requirement.

```tsx
// WellUsageGauge.tsx
function WellUsageGauge({ allocatedAf, usedAf }: Props) {
  const allocated = parseFloat(allocatedAf) || 0;
  const used = parseFloat(usedAf) || 0;
  const remaining = Math.max(0, allocated - used);
  const usedPercent = allocated > 0 ? Math.min((used / allocated) * 100, 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-xs text-white/70 mb-1">
        <span>Used: {used.toFixed(2)} AF</span>
        <span>Remaining: {remaining.toFixed(2)} AF</span>
      </div>
      <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${usedPercent}%`,
            backgroundColor: usedPercent > 90 ? '#ef4444' : usedPercent > 75 ? '#eab308' : '#22c55e',
          }}
        />
      </div>
      <p className="text-xs text-white/50 mt-1">Allocated: {allocated.toFixed(2)} AF</p>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Attaching swipe-down handler to scrollable content:** This conflicts with internal scroll. Attach to header only.
- **Keeping map alive behind sheet route:** Adds significant complexity. Use dark background as pseudo-peek instead.
- **Using charting library for a simple bar:** Adds 30-100KB for something achievable with 10 lines of CSS.
- **Inline arrow functions in render for well markers:** Already warned in CLAUDE.md — use `useCallback` for handlers passed as props.
- **Not memoizing proximity-sorted wells:** The sort with `@turf/distance` runs O(n log n); memoize with `useMemo` keyed on `currentWell.id` and `wells`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture detection | Custom touch event listener with direction/delta logic | `react-swipeable` useSwipeable hook | Handles edge cases (multi-touch, scroll conflicts, thresholds, direction detection) reliably; ~3.5KB |
| Accessible modal dialog | Custom div with manual focus trap, aria attributes | Headless UI `Dialog` | Focus management, escape key, screen reader support built in |
| Haversine distance | Custom math formula | `@turf/distance` | Already installed; handles edge cases (antimeridian, poles) |

**Key insight:** The project already uses Headless UI Dialog for bottom sheets and @turf/distance for GPS — extend these patterns rather than introducing new approaches.

## Common Pitfalls

### Pitfall 1: Swipe-Down Conflicting with Internal Scroll
**What goes wrong:** Attaching a swipe-down dismiss handler to the entire sheet causes it to intercept vertical scroll gestures within the content area. Users can't scroll through readings.
**Why it happens:** Touch events bubble up from the scrollable content to the sheet container.
**How to avoid:** Only attach the swipe-down handler to the fixed header area. The scrollable content area should handle its own scroll independently.
**Warning signs:** Users report they can't scroll the readings list, or the sheet dismisses when they try to scroll up.

### Pitfall 2: Sheet Animation Conflicts with Navigation
**What goes wrong:** When swiping left/right to change wells, the exit animation of the old content and the entrance of the new content fight each other, causing visual jank.
**Why it happens:** State update and CSS transition timing are not coordinated.
**How to avoid:** Use a simple approach: immediately swap content (no cross-fade or slide) OR use a quick 150ms opacity fade. Do NOT try to animate the old content out and new content in simultaneously unless using a library like framer-motion.
**Warning signs:** Content flashes, jumps, or renders partially during well transitions.

### Pitfall 3: PowerSync Text Column Parsing
**What goes wrong:** `allocatedAf` and `usedAf` are stored as TEXT in PowerSync (to preserve decimal precision). Forgetting to `parseFloat()` leads to string concatenation instead of arithmetic.
**Why it happens:** Prior decision [v2.0] stores meter values as TEXT. `remaining = allocated - used` fails if both are strings.
**How to avoid:** Always `parseFloat()` when doing arithmetic with allocation values. Add `|| 0` fallback for null/empty.
**Warning signs:** Gauge shows "NaN%" or "100.25 - 50.125" as text.

### Pitfall 4: Empty Well Location Breaks Proximity Sort
**What goes wrong:** Wells without coordinates (`location === null`) crash the `@turf/distance` call.
**Why it happens:** Some wells may not have GPS coordinates set yet.
**How to avoid:** Filter out wells with `location === null` before computing distances. Already shown in Pattern 3 code example.
**Warning signs:** "Cannot read property 'longitude' of null" error when swiping between wells.

### Pitfall 5: Route Change Unmounts Map
**What goes wrong:** Navigating from `/` to `/wells/:id` unmounts DashboardPage (and its MapView). On dismiss, navigating back to `/` remounts the map from scratch, causing a visible reload delay.
**Why it happens:** React Router replaces the route component.
**How to avoid:** Accept this tradeoff for simplicity. The map reload is fast (~1-2s). If it becomes a UX issue, future optimization could move MapView into AppLayout. For now, the dark background behind the sheet provides a clean visual during the transition.
**Warning signs:** Users see a flash of empty content when dismissing the sheet.

### Pitfall 6: recorded_by User ID Without Name Lookup
**What goes wrong:** Readings list shows a UUID instead of a human-readable name.
**Why it happens:** `recorded_by` stores the Supabase user ID, not a display name.
**How to avoid:** JOIN `readings` with `farm_members` on `user_id = recorded_by` to get `full_name`. Use LEFT JOIN so readings still appear even if the recorder's farm membership was deleted.
**Warning signs:** Readings show something like "a1b2c3d4-e5f6-..." in the User column.

## Code Examples

### Example 1: Headless UI Dialog as Bottom Sheet (Existing Pattern)
```typescript
// Source: src/components/AddWellFormBottomSheet.tsx (existing codebase pattern)
<Dialog open={open} onClose={onClose} className="relative z-50">
  <DialogBackdrop
    transition
    className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
  />
  <div className="fixed inset-0 flex items-end">
    <DialogPanel
      transition
      className="w-full bg-[#5f7248] shadow-xl transition duration-300 ease-out data-[closed]:translate-y-full max-h-[90vh] flex flex-col"
    >
      {/* Pinned header */}
      <div className="flex-shrink-0">{/* ... */}</div>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">{/* ... */}</div>
    </DialogPanel>
  </div>
</Dialog>
```

### Example 2: useSwipeable with Direction Handling
```typescript
// Source: react-swipeable official docs (https://nearform.com/open-source/react-swipeable/docs/api)
import { useSwipeable } from 'react-swipeable';

const swipeHandlers = useSwipeable({
  onSwipedDown: (eventData) => {
    // Only dismiss if swipe delta > threshold
    if (eventData.absY > 80) {
      handleClose();
    }
  },
  onSwipedLeft: () => navigateToNextWell(),
  onSwipedRight: () => navigateToPreviousWell(),
  delta: 40,
  trackTouch: true,
  trackMouse: false,
  preventScrollOnSwipe: false,
});
```

### Example 3: PowerSync JOIN for User Names
```typescript
// Source: Codebase pattern from useWellReadings.ts + UsersPage.tsx
const query = wellId
  ? `SELECT r.id, r.value, r.recorded_at, r.is_in_range,
     r.gps_latitude, r.gps_longitude, r.notes,
     COALESCE(fm.full_name, 'Unknown') as recorder_name
     FROM readings r
     LEFT JOIN farm_members fm ON fm.user_id = r.recorded_by
     WHERE r.well_id = ?
     ORDER BY r.recorded_at DESC`
  : 'SELECT NULL WHERE 0';
```

### Example 4: Status Indicator Mapping
```typescript
// Source: Codebase convention from WellFormData types
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/solid';

function getStatusIcon(state: string) {
  switch (state) {
    case 'Ok': return { icon: CheckCircleIcon, color: 'text-green-400', label: 'OK' };
    case 'Low': return { icon: ExclamationTriangleIcon, color: 'text-yellow-400', label: 'Low' };
    case 'Critical': return { icon: XCircleIcon, color: 'text-red-400', label: 'Critical' };
    case 'Dead': return { icon: XCircleIcon, color: 'text-red-600', label: 'Dead' };
    default: return { icon: QuestionMarkCircleIcon, color: 'text-gray-400', label: 'Unknown' };
  }
}
```

## Discretion Recommendations

### Map Pan on Well Navigation
**Recommendation:** Do NOT pan the map when swiping between wells. The map is behind a 90% sheet with only a 10% sliver visible. Panning would be imperceptible and waste resources. If the map is not actually alive behind the sheet (which is the simpler implementation), this is moot.
**Confidence:** HIGH

### Transition Style Between Wells
**Recommendation:** Use a quick **cross-fade** (150ms opacity transition) rather than a horizontal slide. Reasoning: (1) horizontal slide requires managing two content states simultaneously, adding complexity; (2) cross-fade is simpler to implement (just swap content with opacity transition); (3) feels snappy and native. The content area fades from one well's data to the next.
**Confidence:** HIGH

### Well Info Header Layout
**Recommendation:** Top-down information hierarchy:
1. **Row 1:** Back button (left) | Farm name (center, small text) | Edit button (right)
2. **Row 2:** Well name (large, bold, white)
3. **Row 3:** Serial # | WMIS # | Last Updated (small, horizontal, separated by dots)
4. **Row 4:** Status indicators (Pump, Battery, Meter) as icon+label chips in a row

This follows the pattern of most detail views: navigation first, identity second, metadata third.
**Confidence:** HIGH

### Usage Gauge Visual Design
**Recommendation:** Horizontal bar gauge (not ring/radial). Reasoning: (1) horizontal bar maps naturally to "amount used vs. total"; (2) simpler to build with CSS; (3) consistent with the WellMarker gauge already in the codebase. Color thresholds: green (<75%), yellow (75-90%), red (>90%). Show numeric values above/below the bar.
**Confidence:** HIGH

### Readings History Layout
**Recommendation:** Compact card rows, not a dense table. Each reading is a row with:
- Left: Date (bold) and time (small, gray) stacked vertically
- Center: Value (large, prominent)
- Right: User name (small) and GPS indicator (yellow dot if out-of-range)

This is more touch-friendly than a table and works well on mobile widths. Use a simple `div` list with `divide-y` for separators.
**Confidence:** HIGH

### Empty State Messaging
**Recommendation:** Simple text messages with muted icons, consistent with the app's minimal style:
- No readings: "No readings yet" with a clipboard icon
- No allocation: "No allocation set" with an info icon and brief explanation

No illustrations (the app doesn't use them elsewhere).
**Confidence:** HIGH

### Status Indicator Design
**Recommendation:** Small horizontal chips with icon + label text:
- `Ok` = green CheckCircleIcon + "OK"
- `Low` = yellow ExclamationTriangleIcon + "Low"
- `Critical`/`Dead` = red XCircleIcon + "Critical"/"Dead"
- `Unknown` = gray QuestionMarkCircleIcon + "Unknown"

Grouped in a row: `[Pump: OK] [Battery: Low] [Meter: OK]`
**Confidence:** HIGH

### Edit Button Placement
**Recommendation:** Top-right corner of the header, as a small icon button (PencilSquareIcon). This follows the iOS/Android convention of action buttons in the top-right. Tapping navigates to `/wells/:id/edit` (separate phase).
**Confidence:** HIGH

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Headless UI v1 `<Transition>` component | Headless UI v2 `data-[closed]:` attribute transitions | v2.0 (2024) | Simpler transition API, no wrapper component needed |
| Custom touch event handlers | `react-swipeable` useSwipeable hook | Ongoing | Reliable swipe detection with minimal code |
| Charting libraries for simple gauges | Pure CSS with Tailwind | Ongoing | Zero dependency overhead for simple visualizations |

**Deprecated/outdated:**
- Headless UI v1 `<Transition>` enter/leave props: Replaced by `data-[closed]:` in v2. The codebase already uses v2 pattern.

## Open Questions

1. **PowerSync JOIN performance with large reading sets**
   - What we know: Local SQLite JOINs are fast. `farm_members` table is small (farm users only).
   - What's unclear: If a well has 1000+ readings, does the JOIN add noticeable latency?
   - Recommendation: Proceed with JOIN. If performance is an issue, paginate readings or cache user names in a Map<userId, name>.

2. **Sheet background when map is unmounted**
   - What we know: Navigating from `/` to `/wells/:id` unmounts DashboardPage and its MapView.
   - What's unclear: The 10% peek at the top will show AppLayout's dark background, not the actual map.
   - Recommendation: Use a dark `bg-gray-900` background (already AppLayout's color) for the peek area. This looks intentional and avoids complexity of keeping the map alive.

3. **Well-to-well navigation with single well**
   - What we know: Swipe left/right should cycle between wells.
   - What's unclear: Behavior when there's only one well on the farm.
   - Recommendation: Disable swipe navigation when only one well exists. No visual indicator needed (per user decision).

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/AddWellFormBottomSheet.tsx` — existing Headless UI v2 Dialog slide-up pattern
- Codebase analysis: `src/hooks/useWells.ts`, `useWellReadings.ts`, `useWellAllocations.ts` — data hooks
- Codebase analysis: `src/lib/gps-proximity.ts` — `getDistanceToWell` and `isInRange` functions
- Codebase analysis: `src/lib/powersync-schema.ts` — table schemas and column types
- Codebase analysis: `src/pages/DashboardPage.tsx` — `handleWellClick` navigates to `/wells/${id}`
- react-swipeable official docs: https://nearform.com/open-source/react-swipeable/docs/api — useSwipeable API
- Headless UI v2.1 docs: https://headlessui.com/react/dialog — Dialog component with transition props
- @turf/distance docs: https://turfjs.org/docs/api/distance — Haversine distance calculation

### Secondary (MEDIUM confidence)
- react-swipeable npm: https://www.npmjs.com/package/react-swipeable — v7.0.2, ~3.5KB gzipped (size estimated from prior knowledge, not verified via bundlephobia)
- Headless UI v2.1 blog: https://tailwindcss.com/blog/2024-06-21-headless-ui-v2-1 — simplified transition API

### Tertiary (LOW confidence)
- Bundle size for react-swipeable (~3.5KB gzipped): Estimated from training data, bundlephobia page did not render client-side data. Needs validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All core libraries already in the project except react-swipeable (well-established, minimal)
- Architecture: HIGH — Extending existing patterns (Dialog, PowerSync hooks, routing) with clear examples from codebase
- Pitfalls: HIGH — Identified from direct codebase analysis and known React/touch-event patterns

**Research date:** 2026-02-19
**Valid until:** 2026-03-19 (stable domain, no fast-moving dependencies)
