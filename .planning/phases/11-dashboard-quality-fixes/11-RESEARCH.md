# Phase 11: Dashboard Quality Fixes - Research

**Researched:** 2026-02-12
**Domain:** React component hardening (validation, error handling, accessibility, PWA caching)
**Confidence:** HIGH

## Summary

Phase 11 comprises nine discrete quality fixes (QUAL-01 through QUAL-09) across dashboard and map components. These are targeted improvements rather than architectural changes -- each fix touches a specific file with a well-defined scope.

The current codebase is already in good shape for most of these requirements. Several items (QUAL-01 geolocation guard, QUAL-02 unmount guard, QUAL-04 cache sizes, QUAL-08 ARIA role) appear to already be implemented in the working tree. The primary implementation work centers on adding US-bounds coordinate validation to both form components (QUAL-03, QUAL-06), confirming meter serial number is already optional (QUAL-05), removing the unnecessary `useMemo` in WellMarker (QUAL-07), and verifying/cleaning up ARIA attributes (QUAL-08, QUAL-09).

**Primary recommendation:** Systematically audit each QUAL requirement against current code, implement the missing pieces (primarily US-bounds validation), and verify that already-implemented items meet the success criteria exactly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Coordinate validation uses US-only bounds (approx lat 18-72 N, lng -180 to -66 W) covering continental US + Alaska + Hawaii
- Reject coordinates outside these bounds with inline error messaging
- Meter serial number field stays visible on the form, just not required -- no "(Optional)" label suffix
- Required fields: well name + WMIS ID + coordinates (all three must be filled)
- Save button disabled until all required fields are filled (not validate-on-submit)
- No extra label or indicator for optional fields

### Claude's Discretion
- Validation UX pattern for coordinate errors (match existing app patterns)
- Shared vs separate validation logic between forms
- Map picker bounds enforcement approach
- All accessibility implementation details (ARIA roles, aria-label cleanup)
- Geolocation guard implementation
- Unmount safety pattern for well save handler
- WellMarker static value optimization
- Tile cache size values

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
No new libraries needed. All fixes use existing React patterns and built-in browser APIs.

| Library | Version | Purpose | Already In Use |
|---------|---------|---------|----------------|
| React | 19 | Component framework | Yes |
| TypeScript | (project version) | Type safety | Yes |
| vite-plugin-pwa | (project version) | Service worker / Workbox config | Yes |

### Supporting
No additional libraries required for this phase.

### Alternatives Considered
None -- this phase is pure hardening of existing code.

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
No structural changes needed. All modifications are in-place edits to existing files:
```
src/
  components/
    AddWellFormBottomSheet.tsx    # QUAL-05, QUAL-06 (validation, optional field)
    LocationPickerBottomSheet.tsx # QUAL-03 (US-bounds validation)
    LocationPermissionBanner.tsx  # QUAL-08 (ARIA role)
    MapOfflineOverlay.tsx         # QUAL-09 (aria-label cleanup)
    WellMarker.tsx               # QUAL-07 (remove useMemo)
    MapView.tsx                  # (no changes needed -- geolocation handled via hook)
  hooks/
    useGeolocation.ts            # QUAL-01 (already guarded)
  pages/
    DashboardPage.tsx            # QUAL-02 (already guarded)
  vite.config.ts                 # QUAL-04 (cache sizes)
```

### Pattern 1: US-Bounds Coordinate Validation
**What:** Validate coordinates fall within US territory bounds (lat 18-72, lng -180 to -66)
**When to use:** Both LocationPickerBottomSheet and AddWellFormBottomSheet coordinate inputs
**Recommendation:** Create a shared validation utility since both forms need identical bounds logic. Place in `src/lib/validation.ts`.

```typescript
// src/lib/validation.ts
export const US_BOUNDS = {
  lat: { min: 18, max: 72 },   // Covers continental US + Alaska + Hawaii
  lng: { min: -180, max: -66 }, // Western Alaska (-180) to eastern Maine (-66)
} as const;

export function isValidUSCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= US_BOUNDS.lat.min && lat <= US_BOUNDS.lat.max &&
    lng >= US_BOUNDS.lng.min && lng <= US_BOUNDS.lng.max
  );
}

export function getCoordinateError(lat: number, lng: number): string | null {
  if (lat < US_BOUNDS.lat.min || lat > US_BOUNDS.lat.max) {
    return `Latitude must be between ${US_BOUNDS.lat.min} and ${US_BOUNDS.lat.max}`;
  }
  if (lng < US_BOUNDS.lng.min || lng > US_BOUNDS.lng.max) {
    return `Longitude must be between ${US_BOUNDS.lng.min} and ${US_BOUNDS.lng.max}`;
  }
  return null;
}
```

### Pattern 2: Inline Error Messaging (existing app pattern)
**What:** Display validation errors below the input fields using `<p className="text-red-500 text-xs mt-1">` elements
**When to use:** Coordinate validation errors
**Already established in:** Both `AddWellFormBottomSheet.tsx` (line 268) and `LocationPickerBottomSheet.tsx` (line 160) for GPS errors

```tsx
{coordinateError && (
  <p className="text-red-500 text-xs mt-1">{coordinateError}</p>
)}
```

### Pattern 3: Geolocation API Guard
**What:** Check `navigator.geolocation` existence before calling methods
**Current state:** Already implemented in all three locations:
  - `AddWellFormBottomSheet.tsx` line 83: `if (!navigator.geolocation) { ... return; }`
  - `LocationPickerBottomSheet.tsx` line 31: `if (!navigator.geolocation) { ... return; }`
  - `useGeolocation.ts` line 108: `if (!navigator.geolocation) { ... return; }`

### Pattern 4: Unmount Guard for Async Operations
**What:** Use `isMountedRef` to prevent state updates after component unmount
**Current state:** Already implemented in `DashboardPage.tsx`:
  - Line 37: `const isMountedRef = useRef(true);`
  - Line 39-44: Cleanup effect sets `isMountedRef.current = false` and clears timeout
  - Lines 125, 131, 136: Guard checks before state updates in `handleSaveWell`

### Anti-Patterns to Avoid
- **Redundant aria-label on buttons with visible text:** Screen readers read the button's text content. Adding an `aria-label` that duplicates the visible text is redundant and can cause confusion if they diverge. Only use `aria-label` when the button has no visible text (e.g., icon-only buttons).
- **useMemo for cheap computations:** `useMemo` adds overhead (dependency array comparison) that can exceed the cost of the memoized computation. For simple pure function calls where the component is already wrapped in `React.memo`, the outer memo handles re-render prevention.
- **Overly strict coordinate validation during typing:** If validation rejects partial input (e.g., typing "-" for a negative longitude), users can't enter values. Validate on the current complete value, not character-by-character.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coordinate validation | Inline validation in each component | Shared `src/lib/validation.ts` utility | Same bounds needed in two components; single source of truth |

**Key insight:** The scope of this phase is narrow enough that no complex custom solutions are needed. The shared validation utility is the only abstraction worth creating.

## Common Pitfalls

### Pitfall 1: Coordinate Input Blocking During Typing
**What goes wrong:** Validation logic prevents users from typing negative numbers or decimal points because intermediate states (e.g., "-", "3.", "-1") fail range validation.
**Why it happens:** The current `handleLatitudeChange`/`handleLongitudeChange` handlers parse and validate on every keystroke, rejecting invalid intermediate values.
**How to avoid:** The existing pattern actually handles this well -- it only updates the state value if the parsed number is within range. The input shows `.toFixed(6)` of the stored numeric value. For US-bounds validation, add it to the `isFormValid` / `isNextDisabled` computed check rather than blocking input. Show inline error text when coordinates are outside US bounds but let the user type freely.
**Warning signs:** Users unable to type negative longitudes.

### Pitfall 2: Breaking Existing Coordinate Input UX
**What goes wrong:** The coordinate inputs currently allow global -90/90 and -180/180 ranges during typing but the form validation should enforce US bounds for the save/next button.
**Why it happens:** Mixing "typing guard" validation with "submission guard" validation.
**How to avoid:** Keep the typing-level guards at global ranges (-90/90, -180/180) as they are now. Add US-bounds validation only to `isFormValid` (AddWellFormBottomSheet) and `isNextDisabled` (LocationPickerBottomSheet). Show inline error when coordinates are technically valid globally but outside US bounds.
**Warning signs:** Input fields that refuse to accept any non-US coordinates at all.

### Pitfall 3: ARIA role="alert" vs role="status"
**What goes wrong:** Using `role="alert"` for non-urgent informational banners causes screen readers to interrupt the user.
**Why it happens:** `role="alert"` is an assertive live region -- it interrupts whatever the screen reader is currently reading.
**How to avoid:** `LocationPermissionBanner` already uses `role="alert"` which is appropriate since it's a warning about degraded functionality. The success criteria says "LocationPermissionBanner is announced by screen readers via ARIA role" -- this is already satisfied.
**Warning signs:** N/A -- current implementation is correct.

### Pitfall 4: WellMarker useMemo Removal Regression
**What goes wrong:** Removing `useMemo` from `statusText` could theoretically cause re-computation, but since `WellMarker` is wrapped in `React.memo`, it only re-renders when props change.
**Why it happens:** The `useMemo` with deps `[well.createdAt, well.updatedAt]` is redundant with `React.memo` on the component -- if those props haven't changed, the component doesn't re-render at all.
**How to avoid:** Simply replace `const statusText = useMemo(() => getStatusText(...), [...])` with `const statusText = getStatusText(well.createdAt, well.updatedAt)`. Remove `useMemo` from the import if no longer used.
**Warning signs:** None -- this is a safe simplification.

## Code Examples

### Example 1: Shared US-Bounds Validation Utility
```typescript
// src/lib/validation.ts
export const US_COORDINATE_BOUNDS = {
  lat: { min: 18, max: 72 },
  lng: { min: -180, max: -66 },
} as const;

export function isWithinUSBounds(lat: number, lng: number): boolean {
  return (
    lat >= US_COORDINATE_BOUNDS.lat.min &&
    lat <= US_COORDINATE_BOUNDS.lat.max &&
    lng >= US_COORDINATE_BOUNDS.lng.min &&
    lng <= US_COORDINATE_BOUNDS.lng.max
  );
}

export function getCoordinateValidationError(lat: number, lng: number): string | null {
  if (isNaN(lat) || isNaN(lng)) return 'Invalid coordinates';
  if (lat < -90 || lat > 90) return 'Latitude must be between -90 and 90';
  if (lng < -180 || lng > 180) return 'Longitude must be between -180 and 180';
  if (!isWithinUSBounds(lat, lng)) {
    return 'Coordinates must be within the United States';
  }
  return null;
}
```

### Example 2: AddWellFormBottomSheet isFormValid with US-Bounds
```typescript
// Current (global bounds only):
const isFormValid =
  name.trim() !== '' &&
  wmisNumber.trim() !== '' &&
  latitude >= -90 && latitude <= 90 &&
  longitude >= -180 && longitude <= 180;

// Updated (US bounds):
import { isWithinUSBounds } from '../lib/validation';

const coordinateError = getCoordinateValidationError(latitude, longitude);
const isFormValid =
  name.trim() !== '' &&
  wmisNumber.trim() !== '' &&
  coordinateError === null;
```

### Example 3: WellMarker Static Value Optimization
```typescript
// Current:
import { memo, useCallback, useMemo } from 'react';
// ...
const statusText = useMemo(() => {
  return getStatusText(well.createdAt, well.updatedAt);
}, [well.createdAt, well.updatedAt]);

// Updated:
import { memo, useCallback } from 'react';
// ...
const statusText = getStatusText(well.createdAt, well.updatedAt);
```

### Example 4: LocationPickerBottomSheet with US-Bounds Validation
```typescript
// Current:
const isNextDisabled = !location ||
  location.latitude < -90 || location.latitude > 90 ||
  location.longitude < -180 || location.longitude > 180;

// Updated:
import { getCoordinateValidationError } from '../lib/validation';

const coordinateError = location
  ? getCoordinateValidationError(location.latitude, location.longitude)
  : null;
const isNextDisabled = !location || coordinateError !== null;
```

## Detailed Analysis Per QUAL Requirement

### QUAL-01: Geolocation API Existence Check
**Status:** ALREADY IMPLEMENTED
**Evidence:** All three call sites already guard with `if (!navigator.geolocation)`:
- `AddWellFormBottomSheet.tsx:83`
- `LocationPickerBottomSheet.tsx:31`
- `useGeolocation.ts:108`

**Action needed:** Verify the guard exists in the committed code. No code changes required unless a call site is discovered that lacks the guard.

### QUAL-02: Unmount Guard on Well Save Handler
**Status:** ALREADY IMPLEMENTED
**Evidence:** `DashboardPage.tsx` already has:
- `isMountedRef` (line 37) initialized to `true`
- Cleanup effect (lines 39-44) sets it to `false` and clears timeout
- Guards in `handleSaveWell`: lines 125, 131, 136 all check `isMountedRef.current`

**Action needed:** Verify the committed code matches. No code changes required.

### QUAL-03: LocationPickerBottomSheet Coordinate Range Validation
**Status:** NEEDS CHANGE
**Current:** Uses global ranges (-90/90, -180/180) for `isNextDisabled`
**Required:** US-only bounds (lat 18-72, lng -180 to -66)
**Change:** Import shared validation, replace `isNextDisabled` logic, add inline error display

### QUAL-04: Service Worker Cache Size
**Status:** ALREADY IMPLEMENTED
**Evidence:** `vite.config.ts` already shows:
- `mapbox-api-v1` cache: `maxEntries: 2000` (line 54)
- `mapbox-tiles-v1` cache: `maxEntries: 3000` (line 69)

**Action needed:** Verify the committed config matches. No code changes required.

### QUAL-05: Meter Serial Number Optional
**Status:** ALREADY IMPLEMENTED
**Evidence:** `AddWellFormBottomSheet.tsx`:
- `isFormValid` (lines 161-165) only checks `name`, `wmisNumber`, and coordinates -- `meterSerialNumber` is NOT included
- Label on line 208 says "Meter Serial Number" (no asterisk, no "(Optional)")
- Field is visible and functional but not required

**Action needed:** Verify the committed code matches. No code changes required.

### QUAL-06: AddWellFormBottomSheet Coordinate Range Validation
**Status:** NEEDS CHANGE
**Current:** `isFormValid` uses global ranges (-90/90, -180/180)
**Required:** US-only bounds (lat 18-72, lng -180 to -66) plus inline error messaging
**Change:** Import shared validation, update `isFormValid`, add coordinate error display

### QUAL-07: WellMarker useMemo Removal
**Status:** NEEDS CHANGE
**Current:** `statusText` uses `useMemo(() => getStatusText(...), [deps])`
**Required:** Direct function call `const statusText = getStatusText(...)`
**Change:** Remove useMemo wrapper, remove `useMemo` from import
**Note:** The `allocationPercentage = 100` on line 66 is already a plain constant. The useMemo on `statusText` is what the requirement refers to -- it wraps a cheap pure function call inside a component already protected by `React.memo`.

### QUAL-08: LocationPermissionBanner ARIA Role
**Status:** ALREADY IMPLEMENTED
**Evidence:** `LocationPermissionBanner.tsx` line 10 has `role="alert"` on the outer div
**Action needed:** Verify the committed code matches. No code changes required.

### QUAL-09: MapOfflineOverlay Redundant aria-label
**Status:** ALREADY IMPLEMENTED (or N/A)
**Evidence:** The retry button (lines 43-50) has no `aria-label` attribute. It only has visible text "Try again" and an `aria-hidden="true"` on the icon. There is no redundant aria-label to remove.
**Action needed:** Verify the committed code matches. The button currently has no aria-label, which is correct -- visible text serves as the accessible name.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useRef<T>()` | `useRef<T>(undefined)` | React 19 | Explicit initial value required |
| `useMemo` for all derived values | Direct computation for cheap operations in `memo`-wrapped components | React ecosystem best practice | Less boilerplate, same perf |
| Generic -90/90, -180/180 validation | Application-specific US-bounds validation | This phase | Catches obviously wrong coordinates |

**Deprecated/outdated:**
- None relevant to this phase

## Open Questions

1. **QUAL-09 already appears resolved**
   - What we know: The retry button in MapOfflineOverlay has no `aria-label` attribute in the current code
   - What's unclear: Whether an earlier version had one that was already removed, or whether the requirement was preemptive
   - Recommendation: Verify against committed code. If no `aria-label` exists, mark QUAL-09 as already satisfied and document it in verification

2. **US-bounds edge cases for Alaska**
   - What we know: Alaska extends to longitude -180 (Aleutian Islands) and latitude 72 (North Slope)
   - What's unclear: Whether the exact bounds (18, 72, -180, -66) are precise enough
   - Recommendation: Use the specified bounds. They are approximate but cover all US territory including Alaska, Hawaii, and territories. Exact precision is not critical for a farm well application.

3. **Coordinate error display timing**
   - What we know: User wants inline error messaging for out-of-bounds coordinates
   - What's unclear: Should errors appear immediately when coordinates are entered, or only after the user has finished editing?
   - Recommendation: Show the US-bounds error whenever the coordinate values are outside US bounds (but within global -90/90, -180/180 range). This matches the "save button disabled" pattern -- the user sees why they can't save/proceed.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of all affected files in the working tree and committed versions
- `vite.config.ts` for Workbox/PWA cache configuration
- `src/components/AddWellFormBottomSheet.tsx` for form validation pattern
- `src/components/LocationPickerBottomSheet.tsx` for location picker validation
- `src/components/WellMarker.tsx` for useMemo usage
- `src/components/LocationPermissionBanner.tsx` for ARIA attributes
- `src/components/MapOfflineOverlay.tsx` for ARIA attributes
- `src/pages/DashboardPage.tsx` for unmount guard pattern
- `src/hooks/useGeolocation.ts` for geolocation API guard
- `src/hooks/useGeolocationPermission.ts` for permissions API usage

### Secondary (MEDIUM confidence)
- WAI-ARIA authoring practices for role="alert" vs role="status" usage patterns
- React documentation on `useMemo` usage guidance (cheap computations vs expensive ones)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all changes use existing patterns
- Architecture: HIGH - direct code inspection reveals exact current state of each component
- Pitfalls: HIGH - well-understood patterns (ARIA, React.memo, coordinate validation)

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable domain, no moving targets)
