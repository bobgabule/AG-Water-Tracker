---
phase: 19-permission-enforcement
plan: 01
subsystem: ui
tags: [permissions, react-router, route-guards, rbac]

# Dependency graph
requires:
  - phase: 17-subscription-foundation
    provides: Permission matrix and RequireRole component
provides:
  - 12-action permission matrix replacing coarse manage_wells/view_members
  - Dynamic fallbackPath on RequireRole supporting function-based redirects
  - Route guards for well edit, allocations, and users pages
  - Users nav item gated by manage_users action
affects: [19-permission-enforcement plan 02, future well deletion UI]

# Tech tracking
tech-stack:
  added: []
  patterns: [function-based fallbackPath for context-aware redirects, requiredAction nav filtering]

key-files:
  created: []
  modified:
    - src/lib/permissions.ts
    - src/components/RequireRole.tsx
    - src/App.tsx
    - src/components/SideMenu.tsx

key-decisions:
  - "Removed isAdminOrAbove helper -- confirmed zero imports across codebase"
  - "useParams called unconditionally in RequireRole for dynamic fallback resolution"

patterns-established:
  - "Function fallbackPath: pass (params) => path to RequireRole for context-aware redirect targets"
  - "Nav item gating: add requiredAction property to navItems array entries"

requirements-completed: [PERM-04, PERM-01, PERM-02]

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 19 Plan 01: Permission Matrix & Route Guards Summary

**12-action permission matrix with RequireRole route guards redirecting meter checkers from well edit, allocations, and users pages**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T03:27:58Z
- **Completed:** 2026-02-22T03:31:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced 9-action permission matrix with 12 granular actions matching CONTEXT.md specification
- Enhanced RequireRole to support dynamic function-based fallback paths using useParams
- Added route guards for /wells/:id/edit, /wells/:id/allocations, and /users with appropriate redirects
- Gated Users nav item in SideMenu for meter checkers via requiredAction

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace permission matrix with 12-action system** - `fc7a672` (feat)
2. **Task 2: Enhance RequireRole with dynamic fallback, add route guards, gate Users nav item** - `3aec977` (feat)

**Plan metadata:** `23f790c` (docs: complete plan)

## Files Created/Modified
- `src/lib/permissions.ts` - 12-action ACTIONS array, updated PERMISSION_MATRIX for all 4 roles, removed isAdminOrAbove
- `src/components/RequireRole.tsx` - Added useParams, widened fallbackPath to string | function, resolves path dynamically
- `src/App.tsx` - 3 new RequireRole route guards (edit_well, manage_allocations, manage_users)
- `src/components/SideMenu.tsx` - Added requiredAction: 'manage_users' to Users nav item

## Decisions Made
- Removed isAdminOrAbove() -- grep confirmed zero imports across the entire codebase, making removal safe
- Called useParams() unconditionally in RequireRole -- React Router returns empty object when no params, avoiding conditional hook issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Permission matrix established with all 12 actions
- Route-level guards in place for restricted pages
- Ready for Plan 02 to add button/component-level permission checks and remaining UI gating

## Self-Check: PASSED

- All 5 files verified present on disk
- Both task commits (fc7a672, 3aec977) verified in git log

---
*Phase: 19-permission-enforcement*
*Completed: 2026-02-22*
