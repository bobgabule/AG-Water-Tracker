---
status: diagnosed
phase: 36-fix-reading-gps-and-well-detail-redesign
source: 36-01-SUMMARY.md
started: 2026-02-26T12:00:00Z
updated: 2026-02-26T12:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. GPS Capture Timeout
expected: When submitting a new reading, GPS captures location within ~10s. No "GPS Unavailable" during normal use. Cached GPS (within 60s) reuses immediately.
result: pass

### 2. isSimilar Flag Preservation
expected: When submitting a reading that triggers a "similar reading" warning, then encountering GPS failure or range warning, the similar flag is preserved. Retrying GPS after similar reading should still mark it as similar.
result: issue
reported: "similar reading didn't get a flag"
severity: major

### 3. Well Detail Green Theme
expected: Opening Well Detail shows a green body (dark green background) with white text. Reading rows have alternating backgrounds. Out-of-range flags appear in yellow.
result: issue
reported: "body background should be #607248"
severity: cosmetic

### 4. Gauge Unit Labels
expected: The usage gauge on Well Detail shows the correct unit label based on the well's unit setting — "Gallons", "Cubic Feet", or "AF" (acre-feet).
result: issue
reported: "allocated and used should not have a label gallons although it is set as gallons unit... only gallons left should have gallons unit label"
severity: minor

### 5. Last Updated Timestamp
expected: Well Detail header shows a "Last Updated" line below the well name with a relative date — "Today", "Yesterday", or "Mon Day" format (e.g., "Feb 25").
result: pass

### 6. New Reading Button Styling
expected: The "New Reading" button on Well Detail uses the green confirm button styling consistent with the rest of the design system (not default/generic styling).
result: issue
reported: "correct style but make the button bottom margin / space or gap higher. what is the standard floating bottom button for mobile apps?"
severity: cosmetic

## Summary

total: 6
passed: 2
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Similar reading flag is preserved through GPS failure, range warning, and retry flows"
  status: failed
  reason: "User reported: similar reading didn't get a flag"
  severity: major
  test: 2
  root_cause: "WellReadingsList.tsx has no visual indicator for isSimilarReading. It only flags out-of-range readings (yellow PlayIcon on line 88-93). The is_similar_reading field IS saved to the DB correctly, but the readings list never renders a flag for it."
  artifacts:
    - path: "src/components/WellReadingsList.tsx"
      issue: "No visual indicator for isSimilarReading — only isInRange has a flag icon"
  missing:
    - "Add a visual flag/icon for similar readings in WellReadingsList (e.g., yellow ExclamationTriangleIcon or similar)"

- truth: "Well Detail body background is green (#607248)"
  status: failed
  reason: "User reported: body background should be #607248"
  severity: cosmetic
  test: 3
  root_cause: "CSS token --color-surface-dark is set to #3a4a2a in src/index.css:16. User wants #607248 instead."
  artifacts:
    - path: "src/index.css"
      issue: "--color-surface-dark is #3a4a2a, should be #607248"
  missing:
    - "Change --color-surface-dark from #3a4a2a to #607248 in index.css @theme block"

- truth: "Gauge unit label only shows on 'gallons left', not on allocated/used"
  status: failed
  reason: "User reported: allocated and used should not have a label gallons although it is set as gallons unit... only gallons left should have gallons unit label"
  severity: minor
  test: 4
  root_cause: "WellUsageGauge.tsx lines 91-106 render unitDisplayName on all three labels: '{unitDisplayName} Allocated', '{unitDisplayName} Used', '{unitDisplayName} Left'. User wants unit label only on the 'Left' badge."
  artifacts:
    - path: "src/components/WellUsageGauge.tsx"
      issue: "unitDisplayName shown on Allocated (line 94) and Used (line 100) — should only be on Left (line 104)"
  missing:
    - "Remove unitDisplayName from Allocated and Used labels, keep only on Left badge"

- truth: "New Reading button has proper bottom margin/spacing for mobile floating button"
  status: failed
  reason: "User reported: correct style but make the button bottom margin / space or gap higher. what is the standard floating bottom button for mobile apps?"
  severity: cosmetic
  test: 6
  root_cause: "WellDetailSheet.tsx line 129: pb-[max(0.75rem,env(safe-area-inset-bottom))] gives only 12px bottom padding. Standard mobile FAB spacing is 16-24px from bottom edge plus safe area inset."
  artifacts:
    - path: "src/components/WellDetailSheet.tsx"
      issue: "Bottom padding too small — pb-[max(0.75rem,...)] = 12px, should be ~24px"
  missing:
    - "Increase to pb-[max(1.5rem,env(safe-area-inset-bottom))] (24px) for standard mobile FAB spacing"
