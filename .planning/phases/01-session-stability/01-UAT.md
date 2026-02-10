---
status: diagnosed
phase: 01-session-stability
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md
started: 2026-02-10T12:00:00Z
updated: 2026-02-10T12:15:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. App reload shows dashboard or login within 3 seconds
expected: Reload the app (F5 or pull-to-refresh). You should see either the dashboard with your wells/map OR the login screen within ~3 seconds. You should never see an infinite spinner.
result: issue
reported: "Original 400 error resolved by applying missing migration 019. App now navigates to /onboarding/profile correctly, but 'Something went wrong' error UI flashes briefly before navigation completes."
severity: minor

### 2. Slow load shows "Taking longer than usual..." message
expected: If loading takes more than 5 seconds (e.g., slow network), a "Taking longer than usual..." message appears below the spinner instead of just a blank spinner forever.
result: pass

### 3. RPC failure shows retry button
expected: If the onboarding status check fails (simulate by going offline briefly during load), you should see a "Something went wrong" screen with a "Tap to try again" retry button — not an infinite spinner.
result: issue
reported: "Offline reload shows 'Database initialization failed' error — wa-sqlite-async.wasm fails to load from network. PowerSync DB can't initialize, so RPC retry UI never reached. WASM file not cached by service worker."
severity: major

### 4. Component crash shows error boundary recovery UI
expected: If a component crashes (e.g., map fails to load), you see a friendly "Something went wrong" screen with a retry button instead of a blank white page. The rest of the app (navigation, etc.) remains functional.
result: issue
reported: "Error boundary shows 'Something went wrong' with retry button (good — no blank page), but it covers the entire page. Navigation/sidebar not visible. Error boundary is route-level, not component-scoped."
severity: minor

### 5. Map crash recovers independently
expected: If the map specifically crashes, only the map area shows an error with a retry option. The dashboard FABs (floating action buttons) and bottom sheets remain visible and usable.
result: skipped
reason: Cannot trigger a React-level map crash manually. webglcontextlost handled by Mapbox internally. Test 4 already showed error boundary is full-page, not map-scoped.

### 6. No console.log spam in production
expected: Open browser DevTools console. Navigate around the app normally. You should see zero console.log/warn/error output unless you've enabled debug mode via localStorage.__ag_debug = 'true'.
result: pass

### 7. Dark loading screen (no white flash)
expected: When the app is initializing (loading PowerSync), the loading spinner appears on a dark background (matching app theme), not a bright white flash.
result: pass

## Summary

total: 7
passed: 3
issues: 3
pending: 0
skipped: 1

## Gaps

- truth: "After OTP verification, app resolves to dashboard or login within 3 seconds"
  status: failed
  reason: "User reported: 'Something went wrong' error UI flashes briefly before navigating to onboarding/profile. Original 400 was missing migration (not code bug)."
  severity: minor
  test: 1
  root_cause: "Race condition in RequireOnboarded.tsx — when isAuthReady=true but onboardingStatus is still null (RPC in-flight), condition at line 39 treats null as error and renders ErrorFallback. Once RPC completes (~100-500ms later), component re-renders and navigates correctly."
  artifacts:
    - path: "src/components/RequireOnboarded.tsx"
      issue: "Line 39: `if (!onboardingStatus && session)` shows error UI while RPC is still in-flight"
    - path: "src/lib/AuthProvider.tsx"
      issue: "Lines 145-162: isAuthReady set to true before onboardingStatus is guaranteed populated"
  missing:
    - "Distinguish 'fetching' from 'failed' state for onboardingStatus — add isFetchingOnboarding flag or change isAuthReady to only be true after onboarding fetch completes"

- truth: "RPC failure shows 'Something went wrong' screen with retry button instead of infinite spinner"
  status: failed
  reason: "User reported: Offline reload shows 'Database initialization failed' — wa-sqlite-async.wasm fails to load. WASM not cached by service worker. Never reaches RPC retry UI."
  severity: major
  test: 3
  root_cause: "WASM files ARE in the SW precache manifest (dist/sw.js) with correct glob pattern. However, PowerSync/wa-sqlite resolves WASM paths at runtime relative to node_modules, not from the hashed /assets/ paths. The cached files exist but the library requests them from the wrong URL."
  artifacts:
    - path: "vite.config.ts"
      issue: "Line 44: globPatterns includes *.wasm — files are cached correctly"
    - path: "src/lib/powersync.ts"
      issue: "Lines 15-20: PowerSyncDatabase init has no explicit locateFile/WASM path config"
  missing:
    - "Configure explicit WASM file locations in PowerSync initialization so runtime requests match cached asset paths"

- truth: "Component crash shows error boundary with retry while navigation remains functional"
  status: failed
  reason: "User reported: Error boundary shows 'Something went wrong' with retry (no blank page), but covers entire page — navigation/sidebar not visible. Route-level boundary, not component-scoped."
  severity: minor
  test: 4
  root_cause: "ErrorBoundary in AppLayout.tsx (line 44) wraps entire layout including Header + SideMenu + Outlet. When any page component crashes, error propagates through Outlet to the root EB, which replaces the entire AppLayoutContent with ErrorFallback."
  artifacts:
    - path: "src/components/AppLayout.tsx"
      issue: "Lines 42-50: ErrorBoundary wraps PowerSyncProvider + AppLayoutContent (Header, SideMenu, Outlet all inside)"
    - path: "src/components/AppLayout.tsx"
      issue: "Lines 24-32: Header, SideMenu, and Outlet are siblings inside AppLayoutContent — all inside EB blast radius"
  missing:
    - "Move ErrorBoundary to wrap only <Outlet /> (page content), keep Header and SideMenu outside the EB"
