---
phase: 47-meter-replacement-clean-data-architecture
plan: 02
subsystem: ui-layer
tags: [meter-replacement, bottom-sheet, readings-list, translations, well-edit]
dependency_graph:
  requires: [47-01]
  provides: [meter-replacement-ui]
  affects: [well-edit-page, readings-list, reading-detail, translations]
tech_stack:
  added: []
  patterns: [bottom-sheet-dialog, type-aware-rendering, supabase-direct-write]
key_files:
  created:
    - src/components/MeterReplacementSheet.tsx
  modified:
    - src/pages/WellEditPage.tsx
    - src/components/WellReadingsList.tsx
    - src/pages/ReadingDetailPage.tsx
    - src/i18n/en.ts
    - src/i18n/es.ts
decisions:
  - MeterReplacementSheet uses Supabase direct write (not PowerSync) since it requires internet and updates serial number + inserts reading atomically
  - Replace Meter button uses ArrowPathIcon (refresh/cycle icon) as outlined ghost button style
  - Old serial parsed from notes field using regex replace (notes stored as "Old S/N: ...")
  - Warning banners hidden for meter replacement readings on detail page
  - Added meter.saveReplacement translation key (not in plan) for the save button text
metrics:
  duration: 4min
  completed: "2026-03-30T02:08:41Z"
  tasks: 5
  files: 6
---

# Phase 47 Plan 02: UI Layer -- Bottom Sheet, Readings Display, Translations Summary

MeterReplacementSheet bottom sheet with serial number update and replacement reading insertion, integrated into WellEditPage with type-aware rendering in readings list and detail page, plus bilingual translation keys.

## What Was Done

### Task 2.1: MeterReplacementSheet Component
Created `src/components/MeterReplacementSheet.tsx` -- a slide-up bottom sheet following the same Dialog/DialogPanel pattern as NewReadingSheet. Form includes read-only current serial, new serial input, new starting reading input with decimal keyboard, and helper text. Save flow validates fields, requires internet, updates well serial via Supabase, inserts a `type='meter_replacement'` reading with old serial in notes. Does NOT modify allocation `used_af` or `starting_reading`.

### Task 2.2: WellEditPage -- Replace Meter Button
Added `ArrowPathIcon` outlined button below the serial number/WMIS row. Only visible when `!isReadOnly`. Opens the MeterReplacementSheet. On completion, navigates back to well detail page to reflect updated serial and new reading. Added `useAuth` import for `user.id` and destructured `farmId` from `useActiveFarm`.

### Task 2.3: WellReadingsList -- Type-Aware Rendering
Updated readings table rows to check `reading.type`. Meter replacement entries display "Meter Replaced" in amber italic text instead of the raw value. Pennant flag icons (similar/out-of-range) are hidden for meter replacement rows. Normal readings render unchanged.

### Task 2.4: ReadingDetailPage -- Meter Replacement View
When viewing a meter replacement reading: title shows "Meter Replaced" instead of the date, detail fields show new baseline value and old serial (parsed from notes), warning banners are hidden. Delete button was already hidden from Plan 47-01.

### Task 2.5: Translation Keys
Added 13 new keys in both English and Spanish for meter replacement UI: form labels, validation messages, success toast, detail view labels, and save button text.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 2.5 | 9d35c0d | Translation keys (en + es) |
| 2.1 | c28bbb2 | MeterReplacementSheet component |
| 2.2 | afbeb6e | Replace Meter button in WellEditPage |
| 2.3 | 322fbb5 | Type-aware readings list rendering |
| 2.4 | c83ebb8 | Meter replacement detail view |

## Deviations from Plan

### Auto-added (Rule 2)

**1. [Rule 2] Added meter.saveReplacement translation key**
- **Found during:** Task 2.1
- **Issue:** Plan listed form field keys but no key for the save button label
- **Fix:** Added `meter.saveReplacement` in both en.ts and es.ts
- **Impact:** None -- additive key

**2. [Rule 2] Reordered tasks -- translations first**
- **Found during:** Planning
- **Issue:** Task 2.5 (translations) was listed last but other tasks depend on translation keys
- **Fix:** Executed task 2.5 first to avoid import errors
- **Impact:** None -- same final result

## Verification

- `npx tsc -b --noEmit` passes with zero errors
- MeterReplacementSheet follows NewReadingSheet pattern (Dialog, slide-up, dark green surface)
- Meter replacement bottom sheet opens from well edit page via outlined button
- Save inserts `type='meter_replacement'` reading and updates well serial via Supabase
- "Meter Replaced" row appears in readings list with amber italic style
- Tapping meter replacement row shows detail with baseline value, old serial, no delete button
- Existing readings render normally with flags

## Self-Check: PASSED

All 6 files verified present. All 5 commit hashes verified in git log.
