---
phase: 32-unified-design-system-and-theme-colors
plan: 02
subsystem: ui
tags: [react, components, dialog, button, design-system, tailwind, tokens]

# Dependency graph
requires:
  - phase: 32-01
    provides: "25 semantic @theme color tokens for surfaces, buttons, controls, teal, text"
provides:
  - "Shared ConfirmDialog component replacing 4 copy-pasted dialogs"
  - "Reusable Button component with 5 variants (confirm, danger, ghost, dark, teal)"
  - "Token-based colors in WellEditPage, WellAllocationsPage, UsersPage, EditReadingSheet"
affects: [32-03]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Shared ConfirmDialog with configurable props replaces per-entity dialog files", "Button variant pattern using token-based styles"]

key-files:
  created: ["src/components/ConfirmDialog.tsx", "src/components/Button.tsx"]
  modified: ["src/pages/WellEditPage.tsx", "src/pages/WellAllocationsPage.tsx", "src/pages/UsersPage.tsx", "src/components/EditReadingSheet.tsx"]

key-decisions:
  - "ConfirmDialog accepts ReactNode description for inline span formatting"
  - "Button uses React.forwardRef for ref forwarding compatibility"

patterns-established:
  - "ConfirmDialog: single reusable dialog for all destructive confirmations with title/description/confirmText props"
  - "Button: variant-based button with loading spinner, fullWidth, and forwardRef support"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-02-25
---

# Phase 32 Plan 02: Shared ConfirmDialog and Button Components Summary

**Consolidated 4 identical confirm dialogs into 1 shared ConfirmDialog, created 5-variant Button component, and tokenized all hex colors in 4 caller files**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T02:34:34Z
- **Completed:** 2026-02-25T02:40:09Z
- **Tasks:** 2
- **Files modified:** 10 (2 created, 4 deleted, 4 updated)

## Accomplishments
- Created shared ConfirmDialog component with configurable title, description (ReactNode), confirmText, confirmLoadingText, and loading state
- Created Button component with 5 variants (confirm, danger, ghost, dark, teal), loading spinner, fullWidth prop, and React.forwardRef
- Migrated all 4 callers (WellEditPage, WellAllocationsPage, UsersPage, EditReadingSheet) to use ConfirmDialog
- Deleted 4 redundant ConfirmDelete*Dialog files (net -281 lines)
- Replaced all hardcoded hex colors in 4 caller files with @theme token classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConfirmDialog and Button shared components** - `6b001ec` (feat)
2. **Task 2: Replace 4 confirm dialog callers and tokenize hex values** - `151374a` (refactor)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/components/ConfirmDialog.tsx` - Reusable confirm dialog with configurable title, description, confirm text, and loading
- `src/components/Button.tsx` - Reusable button with 5 variant styles and loading spinner
- `src/pages/WellEditPage.tsx` - Migrated to ConfirmDialog, tokenized 6 hex values
- `src/pages/WellAllocationsPage.tsx` - Migrated to ConfirmDialog, tokenized 5 hex values
- `src/pages/UsersPage.tsx` - Migrated to ConfirmDialog, tokenized 7 hex values
- `src/components/EditReadingSheet.tsx` - Migrated to ConfirmDialog, tokenized 4 hex values
- `src/components/ConfirmDeleteWellDialog.tsx` - Deleted
- `src/components/ConfirmDeleteReadingDialog.tsx` - Deleted
- `src/components/ConfirmDeleteMemberDialog.tsx` - Deleted
- `src/components/ConfirmDeleteAllocationDialog.tsx` - Deleted

## Decisions Made
- ConfirmDialog accepts ReactNode for description prop to support inline `<span>` formatting (bold names/values)
- Button uses React.forwardRef for ref forwarding compatibility with future component composition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ConfirmDialog and Button components available for Plan 03 and future use
- All 4 caller files fully tokenized with @theme classes
- No blockers

## Self-Check: PASSED

- FOUND: src/components/ConfirmDialog.tsx
- FOUND: src/components/Button.tsx
- FOUND: commit 6b001ec (Task 1)
- FOUND: commit 151374a (Task 2)

---
*Phase: 32-unified-design-system-and-theme-colors*
*Completed: 2026-02-25*
