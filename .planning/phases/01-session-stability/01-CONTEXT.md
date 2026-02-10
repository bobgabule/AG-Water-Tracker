# Phase 1: Session Stability - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the three known stability issues: loading spinner hang on session check failure, blank white page on dashboard reload, and SECURITY DEFINER functions exposed in public schema. Add error boundaries so component crashes never take down the entire app. The app must recover gracefully within 3 seconds or show a clear fallback — never an infinite spinner or blank page.

</domain>

<decisions>
## Implementation Decisions

### Recovery fallback
- Claude's discretion on whether to trust local state vs force re-login when session check fails (offline-first is the guiding principle)
- Claude's discretion on timeout duration for session check
- Claude's discretion on handling partial onboarding state when RPC fails
- Claude's discretion on late session rejection behavior (quiet redirect vs toast)

### Error screen UX
- Tone: Friendly and simple — "Something went wrong. Tap to try again." No technical details, approachable language
- Include icon + text on error screens (warning or refresh icon alongside the message)
- Claude's discretion on recovery options (retry only vs retry + dashboard fallback)
- Claude's discretion on error boundary granularity (per-component vs per-page)

### Loading states
- No status text during loading — just visual indicators, no "Connecting..." messages
- Show a "Taking longer than usual..." message if loading exceeds ~5 seconds so user knows it's not frozen
- Claude's discretion on initial load visual (branded splash vs spinner)
- Claude's discretion on dashboard loading visual (skeleton vs spinner vs progressive reveal)

### Console cleanup and security
- Claude's discretion on which console.log statements to remove (at minimum all auth/token/session sensitive ones)
- Claude's discretion on whether to include a hidden debug mode for field support
- SECURITY DEFINER functions: move to private schema (Claude picks schema name)
- Security scope: Quick audit of ALL existing RPC functions for similar issues, not just the known SECURITY DEFINER problem

### Claude's Discretion
- Session recovery strategy (trust local vs force re-login)
- Timeout duration for session check
- Partial onboarding fallback approach
- Late session rejection UX (quiet vs toast)
- Error boundary granularity and recovery options
- Loading indicator style on initial load and dashboard
- Console.log cleanup aggressiveness
- Hidden debug mode decision
- Private schema naming

</decisions>

<specifics>
## Specific Ideas

- Error screens should feel friendly and simple — field agents aren't technical users
- Icon + text pairing on error screens (not text-only)
- No loading status text — keep it clean
- Slow-load detection: after ~5s, show "Taking longer than usual..." so users know the app isn't frozen

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-session-stability*
*Context gathered: 2026-02-10*
