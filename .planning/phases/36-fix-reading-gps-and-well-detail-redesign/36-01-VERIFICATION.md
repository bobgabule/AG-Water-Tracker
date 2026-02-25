---
phase: 36-fix-reading-gps-and-well-detail-redesign
verified: 2026-02-26T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 36: Fix Reading GPS and Well Detail Redesign Verification Report

**Phase Goal:** Fix GPS capture in new reading flow (timeout too short, no cache reuse) and redesign the Well Detail page — green body everywhere, white text readings with alternating rows, unit-aware gauge labels, Last Updated timestamp, and yellow out-of-range flags

**Verified:** 2026-02-26T00:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GPS capture uses 10s timeout and maximumAge:60000 to reuse cached positions | ✓ VERIFIED | NewReadingSheet.tsx:74 — `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }` |
| 2 | isSimilar flag is preserved when GPS fails or user is out-of-range via pendingSimilar state | ✓ VERIFIED | NewReadingSheet.tsx:97 (state), 179 (set before capture), 209/245 (forwarded to save), 467 (forwarded to retry) |
| 3 | Well Detail page body is green (bg-surface-dark) everywhere including behind readings | ✓ VERIFIED | WellDetailSheet.tsx:95,129 + WellUsageGauge.tsx:46 all use bg-surface-dark |
| 4 | Readings list text is white on green with alternating darker row backgrounds | ✓ VERIFIED | WellReadingsList.tsx:35,40,45,64,80-81 — white text + bg-white/5 alternating |
| 5 | Out-of-range flags are yellow (not orange) | ✓ VERIFIED | WellReadingsList.tsx:90 — `text-yellow-400` |
| 6 | Empty readings shows 'No available readings' in white text | ✓ VERIFIED | WellReadingsList.tsx:40 — `text-white/60` with "No available readings" |
| 7 | Gauge labels are unit-aware (Gallons/Cubic Feet/AF based on well.units) | ✓ VERIFIED | WellUsageGauge.tsx:12-18 getUnitDisplayName() + lines 94,100,104 use unitDisplayName |
| 8 | Last Updated timestamp shows below well name in header | ✓ VERIFIED | WellDetailHeader.tsx:6-19 formatRelativeDate() + lines 126-130 render + WellDetailSheet.tsx:78,103 pass prop |
| 9 | New Reading button uses bg-btn-confirm text-btn-confirm-text | ✓ VERIFIED | WellDetailSheet.tsx:133 — correct classes applied |
| 10 | Readings save offline via PowerSync and GPS works from hardware/cache | ✓ VERIFIED | NewReadingSheet.tsx uses usePowerSync() for db operations, maximumAge enables cache reuse |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/NewReadingSheet.tsx` | Fixed GPS capture and isSimilar flag | ✓ VERIFIED | Line 74: maximumAge:60000 present. Lines 97,179,209,245,467: pendingSimilar state fully wired |
| `src/components/WellDetailSheet.tsx` | Green body, lastReadingDate prop | ✓ VERIFIED | Line 95: bg-surface-dark. Line 129: bg-surface-dark on button bar. Line 78: lastReadingDate derived. Line 103: passed to header |
| `src/components/WellUsageGauge.tsx` | Unit-aware labels | ✓ VERIFIED | Lines 12-18: getUnitDisplayName function. Lines 31,94,100,104: unitDisplayName used in labels |
| `src/components/WellReadingsList.tsx` | Green-themed readings list with alternating rows | ✓ VERIFIED | Lines 35,40,45,64,80-81: white text with alternating bg-white/5. Line 90: yellow-400 flags |
| `src/components/WellDetailHeader.tsx` | Last Updated timestamp | ✓ VERIFIED | Lines 6-19: formatRelativeDate helper. Lines 126-130: renders timestamp with prop |

All artifacts exist, are substantive (contain expected patterns and logic), and are fully wired.

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| NewReadingSheet | GPS API | navigator.geolocation.getCurrentPosition | ✓ WIRED | Lines 58-77: captureGps() function with maximumAge parameter |
| NewReadingSheet | pendingSimilar state | setPendingSimilar in handleGpsCaptureAndSave | ✓ WIRED | Line 179: sets before capture. Lines 209,245,467: consumed in all exit paths |
| WellDetailSheet | WellDetailHeader | lastReadingDate prop | ✓ WIRED | Line 78: derives from readings[0]. Line 103: passed as prop |
| WellDetailSheet | WellUsageGauge | unitLabel prop | ✓ WIRED | Line 115: `unitLabel={well.units}` |
| WellUsageGauge | unitDisplayName | getUnitDisplayName helper | ✓ WIRED | Line 31: derives from prop. Lines 94,100,104: rendered in labels |
| WellDetailHeader | formatRelativeDate | formatRelativeDate helper | ✓ WIRED | Lines 6-19: helper defined. Line 128: used to format lastReadingDate |
| WellReadingsList | Alternating rows | index % 2 === 0 logic | ✓ WIRED | Line 64: `bg-white/5` applied conditionally based on index |

All key links verified. All data flows from source to consumer with proper wiring.

### Requirements Coverage

No requirements specified in PLAN frontmatter (`requirements: []`). No orphaned requirements found in REQUIREMENTS.md for Phase 36.

### Anti-Patterns Found

None.

- No TODO/FIXME/placeholder comments (only legitimate input placeholder text)
- No empty implementations or stub functions
- No console.log-only handlers
- All functions have substantive logic

### Human Verification Required

#### 1. GPS capture works in field

**Test:** In field with device, add a reading to a well. Observe GPS capture behavior within the first 10 seconds.

**Expected:** GPS captures successfully within 10 seconds (reusing dashboard's cached position if available). "GPS Unavailable" screen should rarely appear except in true GPS-dead zones.

**Why human:** Requires physical device in field with real GPS hardware. Cannot simulate cached position reuse programmatically.

#### 2. Similar reading flag persists through GPS failure and retry

**Test:** Add a reading within 50 gallons of the previous reading. Click Continue on similar warning. If GPS fails, click Retry. Then Save Without GPS.

**Expected:** After save, the reading should have `is_similar_reading = 1` in the database (check via EditReadingSheet or query).

**Why human:** Requires simulating GPS failure scenario and verifying database flag persistence across multiple view transitions.

#### 3. Out-of-range flag persistence through GPS failure

**Test:** Add a reading while out of range (mock GPS location if needed). If GPS fails and you Save Without GPS, then add another reading in range.

**Expected:** First reading should have `is_in_range = 0` and show yellow flag. Second reading should have `is_in_range = 1` with no flag.

**Why human:** Requires simulating specific GPS failure scenarios and cross-checking range detection logic.

#### 4. Well Detail page visual consistency

**Test:** Open Well Detail page for wells with various data states: wells with readings, empty wells, wells with out-of-range readings, wells in different unit types (GAL/CF/AF).

**Expected:**
- Green body everywhere (no white sections)
- Readings rows alternate with darker green on even rows (bg-white/5)
- All text is white or white/opacity variations
- Out-of-range flags are yellow (not orange)
- Empty state shows "No available readings" in white/60
- Gauge shows unit-appropriate labels (Gallons, Cubic Feet, AF)
- Last Updated appears centered below well name with relative format (Today at 4:03 PM, Yesterday, Month Day)
- New Reading button is light teal with dark text

**Why human:** Visual design verification requires human assessment of color, spacing, readability, and overall aesthetic consistency across different data states.

#### 5. Gauge label unit switching

**Test:** View Well Detail for wells configured with different units: GAL, CF, AF.

**Expected:**
- GAL well shows "Gallons Allocated", "Gallons Used", "Gallons Left"
- CF well shows "Cubic Feet Allocated", "Cubic Feet Used", "Cubic Feet Left"
- AF well shows "AF Allocated", "AF Used", "AF Left"

**Why human:** Requires verifying visual label rendering across multiple well configurations in production data.

#### 6. Last Updated timestamp accuracy and relative formatting

**Test:**
- Add a reading now → check "Last Updated" shows "Today at [time]"
- Wait until after midnight → check it shows "Yesterday at [time]"
- View a well with an old reading → check it shows "Month Day at [time]"

**Expected:** Relative date format is human-readable and matches specification (Today/Yesterday/Month Day pattern with time).

**Why human:** Requires time-based testing and visual verification of date formatting across time boundaries.

---

## Summary

**All automated checks passed.** Phase 36 goal fully achieved:

1. GPS capture now uses 10s timeout with 60s cache reuse — no more premature "GPS Unavailable" failures
2. isSimilar flag correctly persisted through all view transitions including GPS failure and retry
3. Well Detail page fully redesigned with green body, white text, alternating row backgrounds, yellow out-of-range flags
4. Gauge labels dynamically show unit-appropriate text (Gallons/Cubic Feet/AF)
5. Last Updated timestamp shows relative date below well name
6. New Reading button uses consistent design token styling

**Human verification recommended** for field GPS behavior, cross-view flag persistence in edge cases, and visual design consistency across various data states.

---

_Verified: 2026-02-26T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
