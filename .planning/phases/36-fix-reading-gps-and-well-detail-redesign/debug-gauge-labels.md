---
status: resolved
trigger: "Gauge unit label issue - allocated and used should NOT show unit label, only gallons left"
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
---

## Root Cause

In `src/components/WellUsageGauge.tsx`, the `unitDisplayName` (e.g. "Gallons") is rendered on all three usage lines: Allocated, Used, and Left. The user expects the unit label only on the "Left" (remaining) value.

## Affected Lines

**File:** `src/components/WellUsageGauge.tsx`

### Line 94 - REMOVE unit label
```tsx
// BEFORE (line 91-95):
<p className="text-white/80 text-sm">
  <span className="text-white font-semibold">
    {Math.round(allocated)}
  </span>{' '}
  {unitDisplayName} Allocated
</p>

// AFTER:
<p className="text-white/80 text-sm">
  <span className="text-white font-semibold">
    {Math.round(allocated)}
  </span>{' '}
  Allocated
</p>
```

### Line 100 - REMOVE unit label
```tsx
// BEFORE (line 96-101):
<p className="text-white/80 text-sm">
  <span className="text-white font-semibold">
    {Math.round(used)}
  </span>{' '}
  {unitDisplayName} Used
</p>

// AFTER:
<p className="text-white/80 text-sm">
  <span className="text-white font-semibold">
    {Math.round(used)}
  </span>{' '}
  Used
</p>
```

### Line 104 - KEEP unit label (correct as-is)
```tsx
<span className="text-white text-sm font-semibold">
  {Math.round(remaining)} {unitDisplayName} Left
</span>
```

## Summary

| Label | Before | After | Change |
|-------|--------|-------|--------|
| Allocated | "500 Gallons Allocated" | "500 Allocated" | Remove `{unitDisplayName}` |
| Used | "200 Gallons Used" | "200 Used" | Remove `{unitDisplayName}` |
| Left | "300 Gallons Left" | "300 Gallons Left" | No change (keep unit) |

## Fix

Two single-line edits in `src/components/WellUsageGauge.tsx`:
1. Line 94: Remove `{unitDisplayName} ` (keep just `Allocated`)
2. Line 100: Remove `{unitDisplayName} ` (keep just `Used`)
