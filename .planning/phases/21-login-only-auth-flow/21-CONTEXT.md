# Phase 21: Login-Only Auth Flow - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Convert the app from self-service registration to login-only. Invited users auto-join their farm on first OTP login, uninvited users see a "No Active Subscription" redirect page, and all old onboarding code (routes, pages, hooks, utilities) is removed.

</domain>

<decisions>
## Implementation Decisions

### "No Subscription" Page
- Minimal gatekeeper tone — brief, functional, no fluff
- Heading: "No Active Subscription"
- Body text: "Your account has no active farm subscription."
- Shows signed-in phone number ("Signed in as +1 (555) 123-4567")
- "Visit subscription site" link — opens in new tab, URL from app_settings
- If app_settings URL is null/empty, hide the link entirely (just show message + sign out)
- Sign Out button present — returns user to login page
- Simple Heroicon above the message
- Standard responsive layout — no special mobile treatment
- No extra help text or contact info
- Re-checks farm membership on refresh — if admin added them, redirect to dashboard
- No additional error states beyond missing URL handling

### Auto-join Transition
- Seamless redirect: OTP verify -> brief loading -> dashboard (no intermediate screen)
- If invite auto-match fails (revoked, expired, RPC error), fall through to No Subscription page
- No name prompt — straight to dashboard after OTP
- Multiple pending invites: auto-join the most recent one
- Invite is deleted after successful auto-join (no audit trail)
- Returning users (already have farm): no change to flow — OTP -> dashboard, no invite re-check
- Unknown phone (no invite, no account): Supabase creates auth user, lands on No Subscription page
- Role comes from the invite record (admin/grower/viewer)
- Expired invite between SMS and OTP: treated as no invite -> No Subscription page
- Display name set from invite data (first_name, last_name fields)
- No auto-join audit logging — admin sees user appear in farm members list
- Existing user with new invite from different farm: ignore new invite, existing farm takes priority
- Phone number matching: normalize (strip formatting, country code) for comparison
- Invite table needs first_name and last_name fields added

### Login Page
- No copy changes — keep current login page as-is
- No help text or "contact admin" messaging
- Remove any onboarding references that exist on the login page
- Keep current branding/title unchanged

### Claude's Discretion
- Page layout choice (full-page centered vs inside app shell) for No Subscription page
- Error state handling when app_settings fetch fails
- Auto-matching approach (client-side RPC vs server-side trigger)
- Backend RPC design for invite matching and farm joining
- Phone number normalization implementation details

</decisions>

<specifics>
## Specific Ideas

- Invite creation flow stays in Phase 19 territory — Phase 21 only handles what happens AFTER invite is sent and user logs in
- farm_invites table needs schema update: add first_name, last_name columns
- The auto-join RPC should: find matching invite by normalized phone, set user's farm_id + role + name, delete the invite

</specifics>

<deferred>
## Deferred Ideas

- Invite creation flow changes (admin adding users) — Phase 19 handles this
- Multi-farm support (user on multiple farms) — future capability
- Auto-join audit logging — not needed for v1
- Invite expiry grace period — keep it simple, expired = no invite

</deferred>

---

*Phase: 21-login-only-auth-flow*
*Context gathered: 2026-02-22*
