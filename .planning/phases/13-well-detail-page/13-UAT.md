---
status: testing
phase: 13-well-detail-page
source: [13-01-SUMMARY.md, 13-02-SUMMARY.md, 13-03-SUMMARY.md]
started: 2026-02-19T04:10:00Z
updated: 2026-02-19T04:10:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Well Detail Sheet Opens from Map
expected: |
  Tap a well marker on the map. A full-page sheet slides up from the bottom covering ~90% of the screen, with a dark scrim behind it. The map stays loaded underneath.
awaiting: user response

## Tests

### 1. Well Detail Sheet Opens from Map
expected: Tap a well marker on the map. A full-page sheet slides up from the bottom covering ~90% of the screen, with a dark scrim behind it. The map stays loaded underneath.
result: pass (after fix: removed `transition` prop from static DialogPanel)

### 2. Header Metadata & Status Indicators
expected: The sheet header shows the farm name, well name, serial number, WMIS number, and last-updated timestamp. Below that, equipment status chips for Pump, Battery, and Meter appear with color-coded icons (green=Ok, yellow=Low, red=Critical/Dead, gray=Unknown).
result: issue
reported: "I don't see a header and the sheet is too close to the navigation header. It should look like the design screenshot with proper spacing from top, visible farm name, well name, location pin icon, and In Range indicator."
severity: major

### 3. Usage Gauge Display
expected: Below the header, a horizontal bar gauge shows Allocated / Used / Remaining for the current allocation period with color fill (green when low usage, yellow/red as usage increases). If no allocation exists, a "No allocation set for this well" message appears instead.
result: issue
reported: "Design calls for circular usage gauge with Allocated/Used/Remaining numbers alongside serial/WMIS info. Current is a flat horizontal bar. Full redesign needed per Test 2."
severity: major

### 4. Readings History List
expected: A scrollable list of readings shows each entry's date, value, recorder name, and time. Out-of-range readings have a yellow GPS indicator. If no readings exist, a "No readings yet" empty state message appears.
result: issue
reported: "Design calls for table-style layout with DATE/GALLONS/USER-TIME columns and yellow triangle GPS indicators. Current is a card-style list. Redesign needed per Test 2."
severity: major

### 5. Back Button Dismisses Sheet
expected: Tapping the back button (top-left) closes the sheet and returns to the interactive map.
result: [pending]

### 6. Swipe Down Dismisses Sheet
expected: Swiping down on the header area (with enough distance) dismisses the sheet and returns to the map.
result: [pending]

### 7. Swipe Left/Right Cycles Wells
expected: Swiping left or right on the header navigates to the next/previous well with a brief cross-fade transition. Wells are ordered by proximity (nearest first).
result: [pending]

### 8. Overlay Tap Does NOT Dismiss
expected: Tapping the dark scrim area above the sheet does nothing -- the sheet stays open. Only the back button or swipe-down dismisses it.
result: [pending]

## Summary

total: 8
passed: 1
issues: 3
pending: 4
skipped: 0

## Gaps

- truth: "Well detail sheet slides up without error when tapping a well marker"
  status: failed
  reason: "User reported: WellDetailSheet.tsx:121 Error: A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />. Crashes the component tree via error boundary."
  severity: blocker
  test: 1
  root_cause: "WellDetailSheet.tsx line 122: DialogPanel has `transition` prop inside a Dialog with `static` prop. Headless UI v2 static Dialogs don't create a Transition context, so TransitionChild has no parent."
  artifacts:
    - path: "src/components/WellDetailSheet.tsx"
      issue: "DialogPanel transition prop incompatible with static Dialog"
  missing:
    - "Remove `transition` prop from DialogPanel in WellDetailSheet (line 122)"

- truth: "Well detail page layout matches design: full page with map header, pin icon, circular usage gauge, and proper visual hierarchy"
  status: failed
  reason: "User reported: Current bottom-sheet layout is far from expected design. Wants full-page layout with map + marker in the header. Design shows: map peek with satellite imagery, green pin icon, circular usage gauge with Allocated/Used/Remaining, serial/WMIS alongside gauge, table-style readings list with triangle GPS indicators. Current implementation is a flat list with no map header, no circular gauge, no visual hierarchy matching the design."
  severity: major
  test: 2
  artifacts:
    - path: "src/components/WellDetailSheet.tsx"
      issue: "Bottom-sheet layout needs full-page redesign with map header"
    - path: "src/components/WellDetailHeader.tsx"
      issue: "Needs map area with marker pin, different visual hierarchy"
    - path: "src/components/WellUsageGauge.tsx"
      issue: "Horizontal bar needs to become circular/visual gauge matching design"
    - path: "src/components/WellReadingsList.tsx"
      issue: "Needs table-style layout with DATE/GALLONS/USER columns"
  missing:
    - "Full-page layout with map + well marker in header area"
    - "Circular usage gauge showing Allocated/Used/Remaining"
    - "Serial number and WMIS displayed alongside usage gauge"
    - "Table-style readings with DATE, GALLONS, USER/TIME columns"
    - "Yellow triangle indicators for out-of-range readings"
