# Feature Research: Role-Based User Management for AG Water Tracker

**Domain:** Agricultural water tracking PWA -- role-based user management, invite flows, auth
**Researched:** 2026-02-10
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Role-based access control (RBAC)** | Every farm management app (AgriWebb, Farmable, Mobble, Heirloom) has roles. Farm owners expect to control who can do what. | MEDIUM | 4 roles: `super_admin`, `grower`, `admin`, `meter_checker`. Keep it simple -- AgriWebb has 12+ roles which is overkill for this domain. Farmable's 4-role model (Owner/Manager/Crew/Advisor) maps well to our needs. |
| **Invite users by phone number** | Target users are field workers and growers -- phone is their primary identifier. SMS is the natural channel for ag workers who may not check email regularly. | MEDIUM | Already partially built (migration 019, `AddUserModal`, `invite_user_by_phone` RPC). Need to complete the SMS delivery and auto-match flow. |
| **Admin can view team member list** | AgriWebb, Farmable, Mobble all show a user management page listing all team members with their roles and status. Standard expectation for any multi-user app. | LOW | Currently only showing pending invites in `PendingInvitesList`. Need a full member list showing active users with their roles. |
| **Admin can add/invite new users** | Universal across competitors. AgriWebb: "Add User" button with name, email, role. Farmable: Farm Settings > Manage Members. Mobble: Settings > Team Members > green plus button. | LOW | Already built as `AddUserModal` with name, phone, role fields. Needs first_name/last_name split per project context. |
| **Admin can remove/disable users** | AgriWebb has both "Remove user" (permanent) and "Revoke license" (temporary). Farmable has removal. Mobble has "Remove Team Member". Users expect the ability to revoke access. | LOW | Disable (soft) is better than delete (hard) for ag context -- seasonal workers come and go. AgriWebb explicitly recommends "Revoke license" for contractors who come and go. |
| **Role displayed per user** | All competitors show role badges next to user names. Users need to see who has what access at a glance. | LOW | Already showing role badges in `PendingInvitesList` (admin/member badges with color coding). |
| **Phone OTP authentication** | Already the auth method. Passwordless phone auth is standard for mobile-first field service apps. WorkKing, utility field inspection apps all use phone OTP for simplicity. | LOW | Already implemented. Just needs to work correctly with the invite auto-match flow. |
| **Invite status visibility** | Admins need to see whether an invite is pending, expired, or accepted. AgriWebb shows invite validity (28 days). | LOW | Already built in `PendingInvitesList` with Joined/Expired/Pending status badges. |
| **Revoke pending invites** | Admins need to cancel invites before they are used. Standard in all competitors. | LOW | Already built -- `revoke_farm_invite` RPC and delete button in `PendingInvitesList`. |
| **Differentiated onboarding paths** | Growers (farm owners) need full onboarding: profile + farm creation. Invited users should skip straight to the app after OTP verification. Reducing friction for invited users is critical for adoption. | MEDIUM | Partially built in `get_onboarding_status()` RPC with phone-invite auto-matching. Need to ensure the frontend correctly routes invited users past farm creation. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected by users, but create meaningful value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Pre-registration invite (admin fills in user details)** | Unlike competitors that just send an email link and require the invited user to set up their own profile, the admin pre-fills first name, last name, phone, and role. When the invited user OTP-verifies, their profile is auto-created. Zero-friction onboarding for field workers. | LOW | Already built in `get_onboarding_status()` -- auto-creates profile from invite data. This is genuinely better than AgriWebb/Farmable/Mobble which all require invited users to manually create their own profiles. |
| **Phone-based auto-match on OTP** | No invite code needed. User gets SMS, opens the app, verifies their phone number, and is automatically matched to the farm. No code to copy-paste, no link to click. | MEDIUM | Already built in migration 019 (`get_onboarding_status` searches `farm_invites` by phone). The UX advantage is real -- no one else in the ag space does phone-based auto-matching. |
| **Subscription seat limits (UI-only enforcement)** | Show growers what their plan allows (e.g., Basic: 1 admin + 2 meter checkers) without requiring Stripe integration. Creates natural upsell awareness. | LOW | UI-only for now. Validate on invite form ("You've reached your plan limit"). No backend enforcement needed yet. |
| **Offline user management visibility** | Because PowerSync syncs `farm_members` and `farm_invites` tables, the member list and invite status are visible even when offline. Competitors with server-only user management break when offline. | LOW | Already supported by PowerSync schema (`farm_members` and `farm_invites` tables defined in `powersync-schema.ts`). Just need the UI components to read from local SQLite. |
| **SMS invite with deep link** | SMS contains a link that opens the PWA directly (or app store). Reduces steps vs. competitors who send email invites requiring users to manually find and download the app. | MEDIUM | Partially built (`send-invite-sms` edge function called from `AddUserModal`). Need to verify deep link behavior and PWA install flow. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Granular per-feature permissions** | AgriWebb has 12+ roles with per-feature toggles. Seems like "more control = better." | Overwhelming for small farms (2-5 users). Creates admin burden, confusing permission errors, and support tickets. AgriWebb's matrix PDF is evidence of the complexity debt. Farmable wisely stuck to 4 roles. | 4 simple roles with clear descriptions. Each role's capabilities described in plain English on the invite form. |
| **Self-service role change** | Users might want to request role upgrades. | Creates security risk. Farm owners should control access, not field workers. No competitor allows self-service role changes. | Owner/admin changes roles from Settings page. |
| **Multi-farm membership** | Users could belong to multiple farms simultaneously. | Adds complexity to every query, every sync rule, every UI component. AgriWebb supports it but it's an enterprise feature. For a basic water tracker targeting individual growers, this is premature. | Single farm per user. If someone works for multiple farms, they create separate accounts. Revisit in v2+ if requested. |
| **Email-based invites** | Familiar pattern from web apps. | Target users are farm workers who check email infrequently. Phone is the right channel. Adding email creates two invite paths to maintain, two auth methods to support, confusion about which to use. | Phone-only invites via SMS. Consistent with phone OTP auth. |
| **Real-time invite code system** | Current codebase has legacy `invite_code` on farms table. Users might expect to share a code verbally. | Codes can be shared uncontrollably, create security risk, and bypass the admin's intent to invite specific people. Phone-targeted invites give admins explicit control over who joins. | Phone-targeted invites only. The admin explicitly adds each user by phone number. |
| **User activity audit log** | "Who did what when" tracking for compliance. | Significant database and UI complexity. Not needed for a water tracker MVP. Reading records already have `created_by` which covers the primary audit need. | Defer entirely. `created_by` on readings provides basic accountability. |
| **Password-based auth option** | Some users might prefer passwords. | Maintaining two auth methods doubles complexity. Phone OTP is simpler and more secure for the target audience. | Phone OTP only. No passwords. |
| **Stripe subscription integration** | Tempting to build payment flow alongside seat limits. | Premature optimization. Need to validate the product first. Building billing infrastructure before product-market fit is a classic startup mistake. | UI-only seat limit display. "Contact us to upgrade" for now. Add Stripe when there are paying customers. |

## Feature Dependencies

```
[Phone OTP Auth]
    |
    +--requires--> [User Profile Table]
    |                   |
    |                   +--requires--> [Farm Membership]
    |                                       |
    +--requires--> [Invite by Phone RPC]    |
    |                   |                   |
    |                   +--creates--------> [Farm Invite Record]
    |                                       |
    +--requires--> [Get Onboarding Status]  |
                        |                   |
                        +--auto-matches---> [Phone Invite -> Farm Membership]
                        |
                        +--auto-creates---> [User Profile (from invite data)]

[Farm Membership]
    |
    +--enables--> [Role-Based UI Gating]
    |                 |
    |                 +--gates--> [Settings Page (admin/owner only sections)]
    |                 +--gates--> [Add User Modal (admin/owner only)]
    |                 +--gates--> [Well CRUD (role-dependent)]
    |
    +--enables--> [Member List Page]
    |                 |
    |                 +--requires--> [Disable/Enable User]
    |
    +--enables--> [Subscription Seat Limits]
                      |
                      +--requires--> [Member Count Query]
                      +--requires--> [Role Count Query]

[SMS Invite Delivery]
    +--requires--> [Supabase Edge Function]
    +--requires--> [Twilio/SMS Provider]
    +--enhances--> [Invite by Phone RPC]
```

### Dependency Notes

- **Phone OTP Auth requires User Profile Table:** Auth creates the `auth.users` record, but the app needs a `users` table row with farm_id for PowerSync sync rules to work.
- **Get Onboarding Status requires both Profile and Membership checks:** The RPC determines the next step (profile creation, farm join, or dashboard) based on what exists.
- **Phone Auto-Match requires Invite Record:** The `get_onboarding_status` RPC looks up `farm_invites` by phone number to auto-create membership. The invite must exist before the user authenticates.
- **Role-Based UI Gating requires Farm Membership:** The `role` field on `farm_members` drives what UI sections are visible. Must be synced to local PowerSync for offline access.
- **Subscription Seat Limits require Member Count:** The UI needs to query how many users of each role exist before allowing new invites. Must work offline (PowerSync query against local `farm_members`).
- **SMS Invite Delivery enhances but does not block Invite Flow:** If SMS fails, the invite record is still created. Admin can notify the user manually. Already handled in `AddUserModal` with `smsWarning` state.

## MVP Definition

### Launch With (v1) -- This Milestone

Minimum viable user management -- what's needed for a grower to add field agents.

- [x] Phone OTP authentication -- already working
- [x] Invite by phone RPC -- `invite_user_by_phone` already in migration 019
- [x] Add User modal (name, phone, role) -- `AddUserModal` already built
- [x] Pending invites list -- `PendingInvitesList` already built
- [x] Revoke invite -- `revoke_farm_invite` RPC already built
- [x] Phone auto-match on login -- `get_onboarding_status` already auto-matches
- [ ] **Full member list** -- show active farm members (not just invites) with roles
- [ ] **Disable/enable user toggle** -- soft disable (set a flag) rather than hard delete
- [ ] **First name / last name split** on invite form (per project context)
- [ ] **Differentiated onboarding routing** -- invited users skip farm creation
- [ ] **Subscription seat limit UI** -- show plan limits, block invites at limit
- [ ] **Role-based UI gating** -- complete the `isAdminOrOwner` pattern across all relevant pages

### Add After Validation (v1.x)

Features to add once core user management is validated with real users.

- [ ] Resend invite SMS -- if first SMS failed or expired
- [ ] Change user role -- admin can promote member to admin or demote
- [ ] User last active timestamp -- show when each user last synced/logged in
- [ ] Invite expiration handling -- auto-clean expired invites, re-invite flow
- [ ] Confirmation dialog for disable/remove actions

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Multi-farm membership -- only if enterprise customers request it
- [ ] Stripe subscription billing -- only when there are paying customers
- [ ] User activity audit log -- only if compliance requirements emerge
- [ ] Granular per-feature permissions -- only if 4 roles prove insufficient
- [ ] Bulk invite (CSV upload) -- only if farms have 10+ workers

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Full member list page | HIGH | LOW | P1 |
| Disable/enable user | HIGH | LOW | P1 |
| Differentiated onboarding routing | HIGH | MEDIUM | P1 |
| Role-based UI gating (complete) | HIGH | LOW | P1 |
| First/last name on invite form | MEDIUM | LOW | P1 |
| Subscription seat limit UI | MEDIUM | LOW | P1 |
| SMS invite delivery (verify) | MEDIUM | MEDIUM | P1 |
| Resend invite SMS | MEDIUM | LOW | P2 |
| Change user role | MEDIUM | LOW | P2 |
| User last active timestamp | LOW | MEDIUM | P3 |
| Invite expiration cleanup | LOW | LOW | P3 |
| Confirmation dialogs | LOW | LOW | P2 |

**Priority key:**
- P1: Must have for this milestone
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | AgriWebb | Farmable | Mobble | Heirloom | Our Approach |
|---------|----------|----------|--------|----------|--------------|
| **Number of roles** | 12+ (Administrator, Farm Manager, Full Farm User, Livestock Record Keeper 1 & 2, Cropping User, Inventory Only, Map and Tasks, Map Only, Read Only, Transfer Only, No Access) | 4 (Owner, Manager, Crew, Advisor) | 3-4 (Owner, Manager, Member + external via Mobble Connect) | 4 (Administrator, Crew Manager, Crew Member, Reader) | **4 roles** (super_admin, grower, admin, meter_checker). Follows Farmable/Heirloom simplicity model. |
| **Invite method** | Email only | Email only | Email only | Email only | **Phone SMS** -- unique differentiator. Better for field workers who don't use email. |
| **Invite validity** | 28 days | Unknown | Unknown | Unknown | **30 days** (configured in `invite_user_by_phone`). |
| **Auto-profile creation** | No (user must sign up) | No (user must sign up) | No (user must sign up) | No (user must sign up) | **Yes** -- admin pre-fills name, auto-created on OTP verify. Zero-friction for field workers. |
| **Disable vs Remove** | Both ("Remove user" + "Revoke license") | Remove only | Remove only | Unknown | **Disable/enable toggle** (like AgriWebb's revoke license). Better for seasonal workers. |
| **Offline visibility** | No (server-side only) | No | No | No | **Yes** -- member list and invite status synced via PowerSync for offline access. |
| **Subscription user limits** | Unlimited users (all plans) | Unknown | Team member limits by plan (Mobble Connect external users are free) | Unknown | **Tiered limits** (basic: 1 admin + 2 meter checkers). UI enforcement only for now. |
| **Multi-farm support** | Yes (per-farm roles) | Yes (per-farm) | Yes (per-ranch) | Yes | **No** -- single farm per user. Simplicity for v1. |
| **Permission granularity** | Per-feature matrix (40+ toggles) | Per-feature by role (4 roles x ~20 features) | Per-farm access levels | 4 tiers with clear boundaries | **Per-role, no toggles**. Each role has a fixed set of capabilities described in plain English. |

## Sources

### Competitor Documentation (HIGH confidence -- official help docs)
- [AgriWebb User Management](https://help.agriwebb.com/en/articles/2630040-user-management) -- detailed role matrix, invite flow, remove/revoke user
- [Farmable Team Member Permissions](https://support.farmable.tech/en/articles/6227733-what-permissions-can-you-assign-team-members) -- 4-role model with granular per-feature matrix
- [Mobble Add Team Member](https://www.mobble.io/us/help/add-a-new-user) -- email invite, per-ranch, role assignment
- [Heirloom Inviting Collaborators](https://docs.heirloom.ag/help/team-management/inviting-collaborators-to-your-farm/) -- 4 tiers: Administrator, Crew Manager, Crew Member, Reader

### Auth & Invite Flow Patterns (MEDIUM confidence -- industry best practices)
- [Authgear Login/Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide) -- passwordless phone OTP best practices
- [RBAC Best Practices 2025](https://www.cloudtoggle.com/blog-en/role-based-access-control-best-practices/) -- role-based provisioning templates
- [Field Service Software Tips 2026](https://ezmanagement.com/tips-for-field-service-software-in-2026/) -- mobile-first, offline-capable requirements

### Water Meter Reading Apps (MEDIUM confidence -- domain-specific)
- [Wheatley Pinpoint](https://www.wheatleysolutions.co.uk/products/wheatley-pinpoint/) -- PWA-based water meter data management with offline
- [Axonator Water Meter Reading App](https://axonator.com/app/water-meter-reading-app/) -- field data collection with role-based access

### Existing Codebase (HIGH confidence -- primary source)
- `supabase/migrations/019_phone_invite_flow.sql` -- invite_user_by_phone, get_onboarding_status, revoke_farm_invite RPCs
- `src/components/AddUserModal.tsx` -- invite form with name, phone, role
- `src/components/PendingInvitesList.tsx` -- invite status display with revoke
- `src/pages/SettingsPage.tsx` -- team management section with admin gating
- `src/lib/powersync-schema.ts` -- farm_members, farm_invites table definitions

---
*Feature research for: AG Water Tracker -- Role-Based User Management Milestone*
*Researched: 2026-02-10*
