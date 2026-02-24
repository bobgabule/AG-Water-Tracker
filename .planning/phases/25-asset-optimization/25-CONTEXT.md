# Phase 25: Asset Optimization - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Compress the 11MB auth background image to <300KB using modern format, and ensure authenticated dashboard users never fetch it. The auth page background must load fast on any connection.

</domain>

<decisions>
## Implementation Decisions

### Image quality & dimensions
- Aggressive compression: quality 40-50 (the dark gradient overlay at 70-90% opacity hides most detail)
- Target resolution: 1920px wide (covers 95% of screens; overlay hides upscale artifacts on 4K)
- Single size — no responsive breakpoints (compressed file will be small enough for mobile)
- Keep current farm photo — same image, just compressed

### Format delivery
- WebP only — no AVIF, no JPEG fallback
- WebP has 97%+ browser support; the 3% without it see the solid background color (#1a3a2a) which already exists as CSS fallback
- Delete the original 11MB bg-farm.jpg from the repo entirely (available in git history if ever needed)

### Loading experience
- Solid color (#1a3a2a) shows immediately, image swaps in when ready (no fade-in effect)
- Eager loading via CSS background-image (AuthLayout is already code-split — no lazy-load needed)
- Move image from public/ to src/assets/ so Vite processes it (hashed filename, only bundled when AuthLayout is loaded — guarantees ASSET-02)
- No service worker precache — at <100KB the image loads fast enough; precaching would bloat cache for dashboard-only users
- No layout shift concerns — container is already absolute-positioned with inset-0

### Build pipeline
- One-time manual conversion using sharp (Node.js) via npx — no permanent dependency
- No documentation or scripts needed — the sharp command will be in the git commit message
- No build-time image processing plugin (image doesn't change)

### Claude's Discretion
- Exact sharp CLI parameters (quality value within 40-50 range, resize options)
- Whether to apply any additional sharpening or blur during conversion
- TypeScript import declaration for .webp files if needed

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Key constraint is that the heavy gradient overlay (`rgba(20,40,60,0.9)` to `rgba(10,30,20,0.7)`) means aggressive compression is invisible to users.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-asset-optimization*
*Context gathered: 2026-02-25*
