---
status: testing
phase: 14-record-meter-reading
source: [14-01-SUMMARY.md, 14-02-SUMMARY.md]
started: 2026-02-19T04:00:00Z
updated: 2026-02-19T04:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 2
name: Reading Form Display
expected: |
  The Reading tab shows a numeric input field with a decimal keypad. The well's measurement unit and multiplier are displayed (e.g., "GAL x 10.0") so you know what scale to read.
awaiting: user response

## Tests

### 1. Open New Reading Sheet
expected: Tap a well on the map to open well detail. A "+ New Reading" button appears at the bottom. Tapping it opens a bottom sheet with "Reading" and "Meter Problem" tabs.
result: issue
reported: "Error: A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />. Crashes the component tree."
severity: blocker

### 2. Reading Form Display
expected: The Reading tab shows a numeric input field with a decimal keypad. The well's measurement unit and multiplier are displayed (e.g., "GAL x 10.0") so you know what scale to read.
result: [pending]

### 3. Submit a Meter Reading
expected: Enter a valid numeric meter value and tap Submit. The sheet closes, a green success toast appears at the top of the screen confirming the reading was saved. The reading should appear in the well's readings history list.
result: [pending]

### 4. Similar Reading Warning
expected: Enter a value within 5 units of the last reading for that well. Instead of saving immediately, a warning screen appears asking you to double-check the value. You can go back to edit or continue to save anyway.
result: [pending]

### 5. Toast Auto-Dismiss
expected: After a successful action (like saving a reading), the green success toast at the top auto-dismisses after about 3 seconds. You can also tap it to dismiss immediately.
result: [pending]

### 6. Meter Problem Tab
expected: Switch to the "Meter Problem" tab in the New Reading sheet. Four checkboxes appear: Not Working, Battery Dead, Pump Off, Dead Pump. Each can be checked independently.
result: [pending]

### 7. Submit Meter Problem
expected: Check one or more meter problem checkboxes and tap Submit. The sheet closes, a success toast appears, and the well's equipment status indicators on the well detail page update to reflect the reported problems.
result: [pending]

## Summary

total: 7
passed: 0
issues: 1
pending: 6
skipped: 0

## Gaps

- truth: "Tap well detail page + New Reading button opens NewReadingSheet without error"
  status: failed
  reason: "User reported: Error: A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />. Crashes the component tree."
  severity: blocker
  test: 1
  root_cause: "WellDetailSheet.tsx line 122: DialogPanel has `transition` prop inside a Dialog with `static` prop. Headless UI v2 static Dialogs don't create a Transition context, so TransitionChild has no parent."
  artifacts:
    - path: "src/components/WellDetailSheet.tsx"
      issue: "DialogPanel transition prop incompatible with static Dialog"
  missing:
    - "Remove `transition` prop from DialogPanel in WellDetailSheet (line 122) since static Dialog never transitions"
  debug_session: ""
