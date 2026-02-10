# Stack Research

**Domain:** Role-based access control, SMS invite flows, and subscription billing for an offline-first agricultural water tracking PWA
**Researched:** 2026-02-10
**Confidence:** HIGH (core RBAC/auth), MEDIUM (billing/subscriptions)

## Context: Existing Stack (Do Not Change)

These technologies are already in production and are NOT part of this research. Listed for compatibility reference only.

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.2.0 | UI framework |
| Vite | ^6.4.1 | Build tool |
| TypeScript | ~5.9.3 | Type safety |
| Tailwind CSS | ^4.1.18 | Styling (CSS-first config) |
| @powersync/web | ^1.32.0 | Offline-first SQLite sync |
| @powersync/react | ^1.8.2 | React bindings for PowerSync |
| @supabase/supabase-js | ^2.93.3 | Supabase client |
| Mapbox GL JS | ^3.18.1 | Maps |
| react-map-gl | ^8.1.0 | React Mapbox wrapper |
| Headless UI | ^2.2.9 | Accessible UI primitives |
| Heroicons | ^2.2.0 | Icons |
| React Router | ^7.13.0 | Routing |
| vite-plugin-pwa | ^1.2.0 | PWA support |
| Zustand | (installed) | UI state |

## Recommended Stack (New Additions for This Milestone)

### 1. Role-Based Access Control (RBAC)

**Confidence:** HIGH -- verified via Supabase official docs and Context7.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Custom Access Token Hook | N/A (Supabase platform feature) | Inject `user_role` and `farm_id` into JWT claims at token issuance | Eliminates per-request role lookups in RLS. Role is baked into the JWT, so both Supabase RLS and PowerSync sync rules can read it without additional queries. Official Supabase pattern for RBAC. |
| `authorize()` PL/pgSQL function | N/A (custom SQL function) | Permission-check helper for RLS policies | Reads role from `auth.jwt() ->> 'user_role'`, queries `role_permissions` table, returns boolean. Centralized permission logic -- change permissions in one table, all RLS policies update. |
| `role_permissions` table | N/A (PostgreSQL) | Map roles to granular permissions | Decouples role names from specific actions. Adding a new role or permission is a row insert, not an RLS policy rewrite. |

**Architecture Decision: Custom Access Token Hook over app_metadata**

Why NOT `app_metadata`: Writing to `app_metadata` requires the `service_role` key (admin-level access). It is set at signup/admin-update time and is NOT automatically updated when a user's role changes in `farm_members`. This creates a stale-data risk where the JWT contains an outdated role.

Why Custom Access Token Hook: The hook fires **every time a token is issued** (login, refresh, etc.), so it always reads the current role from `farm_members`. No stale-data risk. No need to propagate role changes to `app_metadata`. The hook is a Postgres function -- no external service needed.

**Role Hierarchy:**

```
super_admin > grower (farm owner) > admin > meter_checker (read-only + readings)
```

| Role | Permissions |
|------|-------------|
| `super_admin` | All operations across all farms. Platform-level administration. |
| `grower` | Full control of own farm: manage wells, users, settings, billing. |
| `admin` | Manage wells, invite/remove users (except grower), record readings. |
| `meter_checker` | View wells, record meter readings. No management access. |

### 2. PowerSync Sync Rules with Role Claims

**Confidence:** HIGH -- verified via PowerSync docs and Context7.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `request.jwt()` in sync rules | PowerSync Service (current) | Access custom JWT claims in parameter queries | PowerSync now supports `request.jwt()` to read arbitrary JWT fields. With the Custom Access Token Hook injecting `user_role` into the JWT, sync rules can filter data by role without additional database joins. |

**Sync Rule Pattern for Role-Based Filtering:**

```yaml
# Example: Only sync farm_invites to grower/admin roles
farm_invites_management:
  parameters: |
    SELECT fm.farm_id
    FROM farm_members fm
    WHERE fm.user_id = request.user_id()
    AND fm.role IN (
      SELECT CASE
        WHEN request.jwt() ->> 'user_role' IN ('grower', 'admin', 'super_admin')
        THEN fm.role
      END
    )
  data:
    - SELECT code AS id, farm_id, role, invited_phone, invited_name,
             expires_at, max_uses, uses_count, created_by, created_at
      FROM farm_invites WHERE farm_id = bucket.farm_id
```

**Important caveat:** PowerSync parameter queries support limited SQL. The actual implementation may need to use simpler role checks (e.g., separate buckets per role, as the project currently does with `farm_invites_owner` and `farm_invites_admin`). Verify the exact SQL subset supported by testing on the PowerSync dashboard.

### 3. SMS Invite Flow

**Confidence:** HIGH -- existing `send-invite-sms` Edge Function + Twilio already in codebase.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Edge Functions (Deno) | Supabase CLI v1.215.0+ | Server-side SMS sending via Twilio | Already in use. Deno runtime, TypeScript-native, global edge deployment. Keeps Twilio credentials server-side. |
| Twilio Programmable Messaging API | REST API (2010-04-01) | Send invite SMS to new users | Already integrated. Direct REST API calls (no SDK needed in Deno). ~$0.0079/SMS for US numbers. More cost-effective than Twilio Verify ($0.05+/verification) for invite-only messages. |
| Supabase Phone OTP (Twilio Verify) | Built-in Supabase Auth | OTP verification for invited users | Already configured. Handles OTP generation, delivery, and verification. Keep as-is for authentication; use Programmable Messaging only for invite notifications. |

**Do NOT use the Send SMS Auth Hook for invite messages.** The Send SMS Hook replaces Supabase's built-in OTP delivery -- it is for customizing the authentication SMS, not for sending arbitrary messages. Invite SMSes are non-auth messages and should go through a separate Edge Function (as currently implemented).

**Invite Flow Architecture (already partially implemented):**

```
1. Admin calls `invite_user_by_phone` RPC (creates farm_invite record)
2. Client calls `send-invite-sms` Edge Function (sends SMS via Twilio)
3. Invited user opens app, enters phone for OTP
4. Supabase Auth sends OTP via Twilio Verify
5. User verifies OTP
6. `get_onboarding_status()` RPC auto-matches phone to pending invite
7. Auto-creates user profile + farm_members record
8. User lands on map (fully onboarded)
```

### 4. Subscription & Billing (User Limits)

**Confidence:** MEDIUM -- standard Stripe + Supabase pattern, but no code in repo yet.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Stripe Checkout | API (latest) | Subscription creation and management | Industry standard for SaaS billing. Hosted checkout page eliminates PCI compliance burden. Works with any frontend (no React dependency for payment page). |
| @stripe/stripe-js | ^8.7.0 | Stripe.js loader for client-side | Loads Stripe.js securely. Needed for redirectToCheckout and customer portal links. Lightweight (~15KB). |
| Supabase Edge Function (Stripe webhook) | Deno runtime | Process Stripe webhook events | Listens for `customer.subscription.created`, `updated`, `deleted`. Updates a `subscriptions` table in Supabase with plan tier and user limits. |
| `subscriptions` table | PostgreSQL | Store subscription state | Maps `farm_id` to Stripe `customer_id`, plan tier, `max_users`, `status`. RLS ensures only farm grower can see billing info. |

**Do NOT use @stripe/react-stripe-js** unless you need embedded payment forms (Elements). For subscription-based billing with Stripe Checkout (redirect flow), you only need `@stripe/stripe-js` to call `redirectToCheckout()`. Adding the React wrapper adds complexity without benefit.

**Do NOT use Stripe Sync Engine** (`@supabase/stripe-sync-engine`). It syncs ALL Stripe data (products, prices, invoices, etc.) to your database. This app only needs subscription status. A simple webhook handler is lighter, faster, and easier to maintain.

**User Limit Enforcement:**

```sql
-- In invite_user_by_phone RPC, add check:
SELECT COUNT(*) INTO v_member_count
FROM farm_members WHERE farm_id = p_farm_id;

SELECT max_users INTO v_max_users
FROM subscriptions WHERE farm_id = p_farm_id AND status = 'active';

IF v_member_count >= COALESCE(v_max_users, 3) THEN  -- default free tier: 3 users
    RAISE EXCEPTION 'User limit reached. Upgrade your plan to add more members.';
END IF;
```

### 5. Offline Session Persistence

**Confidence:** HIGH -- verified via PowerSync docs and existing connector code.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| PowerSync `fetchCredentials()` with token refresh | Existing connector | Maintain sync after offline periods | Already implemented in `SupabaseConnector.fetchCredentials()`. Calls `supabase.auth.refreshSession()` when session is expired. PowerSync calls this every few minutes and on reconnection. |
| Supabase Auth session persistence | @supabase/supabase-js ^2.93.3 | Persist auth session in browser storage | Supabase JS client persists sessions to `localStorage` by default. On app reopen, `getSession()` returns the cached session. If expired, `refreshSession()` uses the refresh token. |
| Service Worker (vite-plugin-pwa) | ^1.2.0 | Cache app shell for offline access | Already configured. Ensures the app loads from cache when offline. Combined with PowerSync's local SQLite, the app is fully functional offline. |

**No new libraries needed for offline session persistence.** The existing stack handles this correctly:
- Supabase persists sessions to localStorage (survives app close/reopen)
- PowerSync's `fetchCredentials()` already handles token refresh
- The Service Worker caches the app shell
- PowerSync queues CRUD operations locally and syncs on reconnect

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/stripe-js | ^8.7.0 | Stripe.js loader for Checkout redirect | Only when implementing billing. Defer until subscription feature is built. |
| jwt-decode | ^4.0.0 | Decode JWT on client to read custom claims | Only if you need client-side role checks (e.g., showing/hiding UI based on role). The JWT is already decoded by Supabase Auth -- access via `session.access_token`. Consider `jwtDecode(session.access_token)` for reading `user_role`. |

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Supabase CLI | Edge Function development, migrations, local dev | Use `supabase functions serve` for local Edge Function testing with hot reload. Requires Node.js 20+. |
| Stripe CLI | Webhook testing during development | `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook` forwards events to local Supabase Edge Functions. |

## Installation

```bash
# RBAC: No new npm packages needed -- all Postgres functions and RLS policies
# SMS: No new npm packages needed -- existing Edge Function and Twilio

# Billing (when ready to implement):
npm install @stripe/stripe-js

# Optional: JWT decoding for client-side role checks
npm install jwt-decode
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Custom Access Token Hook | `app_metadata` for roles | Never for this project. `app_metadata` requires manual updates and stales when role changes. The hook reads live data on every token issuance. |
| Custom Access Token Hook | Supabase `set_claim()` community extension | Only if you cannot use Auth Hooks (self-hosted Supabase without hook support). The community `supabase-custom-claims` extension manages claims via `app_metadata` with helper functions, but still has the staleness problem. |
| `role_permissions` table | Hardcoded role checks in RLS | Only for very simple apps with 2 roles that will never change. The table approach scales to N roles and M permissions without touching RLS policies. |
| Stripe Checkout (redirect) | Stripe Elements (embedded) | Only if you need a fully custom payment UI embedded in your app. Checkout is faster to implement, PCI-compliant out of the box, and handles SCA/3DS automatically. |
| Twilio Programmable Messaging | Twilio Verify for invites | Never for invite messages. Verify is designed for OTP verification (higher cost, unnecessary verification step). Use Verify only for auth OTP (already configured). |
| Separate invite Edge Function | Send SMS Auth Hook for invites | Never. The Send SMS Hook replaces Supabase's OTP delivery mechanism. Using it for invite messages would break OTP auth flow. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `app_metadata` for dynamic roles | Stales between updates. Requires `service_role` key to write. Not automatically refreshed when role changes in `farm_members`. | Custom Access Token Hook (reads live data on every token issuance) |
| `@supabase/stripe-sync-engine` | Heavyweight -- syncs ALL Stripe data (products, prices, invoices, subscriptions, customers). This app only needs subscription status for user limits. | Single webhook Edge Function that updates a `subscriptions` table |
| `@stripe/react-stripe-js` | Adds React wrapper components for Stripe Elements. Unnecessary for Stripe Checkout (redirect) flow. Adds bundle size for no benefit. | `@stripe/stripe-js` directly for `redirectToCheckout()` |
| Supabase Realtime for role changes | PowerSync already handles data sync. Adding Realtime creates a second sync channel, increasing complexity and potential conflicts. | PowerSync sync rules filter by role from JWT. When role changes, next token refresh picks up new role. |
| Custom SMS Auth Hook for invite messages | Replaces Supabase's built-in OTP delivery. Would break phone OTP authentication. Designed for swapping the OTP SMS provider, not for arbitrary messages. | Separate Edge Function calling Twilio Programmable Messaging API |
| `supabase-custom-claims` community extension | Third-party extension. Uses `app_metadata` under the hood (same staleness problem). Not officially supported. | Custom Access Token Hook (first-party, officially documented) |

## Stack Patterns by Variant

**If adding a new role:**
- Add row to `role_permissions` table (e.g., `INSERT INTO role_permissions (role, permission) VALUES ('new_role', 'wells.read')`)
- Update `custom_access_token_hook` if the role enum type needs expanding
- No RLS policy changes needed (policies read from `role_permissions` via `authorize()`)

**If changing sync rules for a new role:**
- Option A: Add a new bucket definition scoped to the role (simple, explicit)
- Option B: Use `request.jwt() ->> 'user_role'` in parameter queries (requires testing PowerSync SQL subset support)
- Prefer Option A until PowerSync SQL subset is verified

**If the user is offline when their role changes:**
- PowerSync continues serving cached data until reconnection
- On reconnect, `fetchCredentials()` refreshes the Supabase session
- New JWT includes updated role from Custom Access Token Hook
- PowerSync re-evaluates sync rules with new JWT, syncs appropriate data
- Stale data for the old role is cleaned up by PowerSync automatically

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| @supabase/supabase-js ^2.93.3 | Custom Access Token Hooks | Hooks are a server-side Supabase platform feature. No client-side version dependency. |
| @powersync/web ^1.32.0 | `request.jwt()` in sync rules | Sync rules are evaluated server-side by PowerSync Service. Client SDK version does not affect sync rule capabilities. |
| @stripe/stripe-js ^8.7.0 | React ^19.2.0 | stripe-js is framework-agnostic. No React version dependency. |
| jwt-decode ^4.0.0 | @supabase/supabase-js ^2.x | Used to decode the `access_token` string from Supabase session. Compatible with any JWT. |
| Supabase CLI v1.215.0+ | Edge Functions with per-function deno.json | Required for deploying Edge Functions with individual dependency management. |

## Sources

- [Supabase Custom Claims & RBAC Guide](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) -- HIGH confidence, official docs (verified 2026-02-09)
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) -- HIGH confidence, official docs (verified 2026-02-09)
- [Supabase Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) -- HIGH confidence, official docs
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) -- HIGH confidence, official docs
- [Supabase Stripe Webhooks Guide](https://supabase.com/docs/guides/functions/examples/stripe-webhooks) -- HIGH confidence, official docs
- [PowerSync Sync Rules Documentation](https://docs.powersync.com/usage/sync-rules) -- HIGH confidence, official docs
- [PowerSync Parameter Queries](https://docs.powersync.com/usage/sync-rules/parameter-queries) -- HIGH confidence, official docs
- [PowerSync Client Parameters (request.jwt())](https://docs.powersync.com/usage/sync-rules/advanced-topics/client-parameters) -- HIGH confidence, official docs
- [PowerSync Improved Sync Rules Syntax](https://releases.powersync.com/announcements/improved-parameter-query-syntax-in-sync-rules) -- HIGH confidence, official release notes
- [@powersync/web npm](https://www.npmjs.com/package/@powersync/web) -- HIGH confidence, latest v1.30.0 (project uses ^1.32.0 which resolves higher)
- [@powersync/react npm](https://www.npmjs.com/package/@powersync/react) -- HIGH confidence, latest v1.8.1 (project uses ^1.8.2)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- HIGH confidence, latest v2.95.3 (project uses ^2.93.3)
- [@stripe/stripe-js npm](https://www.npmjs.com/package/@stripe/stripe-js) -- HIGH confidence, v8.7.0
- [Stripe Webhooks Handling](https://supabase.com/docs/guides/functions/examples/stripe-webhooks) -- HIGH confidence, official docs
- Context7: `/supabase/supabase` -- Custom claims, RLS RBAC patterns, Edge Functions SMS
- Context7: `/llmstxt/powersync_llms-full_txt` -- Sync rules, parameter queries, JWT access

---
*Stack research for: AG Water Tracker -- Role-based access, SMS invites, subscription billing*
*Researched: 2026-02-10*
