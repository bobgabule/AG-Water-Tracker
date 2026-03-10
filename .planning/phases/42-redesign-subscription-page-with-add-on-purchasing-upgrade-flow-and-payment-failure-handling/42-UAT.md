---
status: diagnosed
phase: 42-redesign-subscription-page-with-add-on-purchasing-upgrade-flow-and-payment-failure-handling
source: [42-01-SUMMARY.md, 42-02-SUMMARY.md, 42-03-SUMMARY.md]
started: 2026-03-10T00:00:00Z
updated: 2026-03-10T00:06:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Subscription Page Layout
expected: Navigate to Subscription page. Should see a 2-column layout on desktop (plan info left, add-ons right) with dark-themed cards and AG watermark background. On mobile, collapses to single column.
result: issue
reported: "fail remove AG watermark"
severity: major

### 2. Add-On Quantity Counters
expected: Subscription page shows quantity counters for Wells ($100/mo), Admin Seats ($100/mo), and Meter Checkers ($50/mo) with minus/plus buttons. Counters start at 0 and can't go below 0.
result: pass

### 3. Add-On Purchase Button
expected: Increase any quantity counter above 0. A purchase button appears with total cost. Clicking it calls the purchase-addons edge function.
result: issue
reported: "fail - Failed to send a request to the Edge Function"
severity: blocker

### 4. Stripe Portal Button
expected: "Open Billing Portal" button is visible on the page. It opens Stripe's hosted portal for payment method and invoice management.
result: issue
reported: "no billing portal needed"
severity: major

### 5. Cancel Subscription Link
expected: At the bottom of the page, a subtle (low opacity) cancel subscription link is visible for owner/super_admin only.
result: issue
reported: "fail - when hovering the cancel subscription, switch to pointer cursor. also there is an error when cancelling the subscription. its not working"
severity: blocker

### 6. Admin View-Only Access
expected: Admin users can navigate to the Subscription page via the sidebar. They see all subscription details but do NOT see purchase, upgrade, or cancel actions.
result: issue
reported: "fail - admin should be able to purchase add ons"
severity: major

### 7. Spanish Translation
expected: Switch language to Spanish. All subscription page text renders in Spanish with no missing/broken keys.
result: pass

## Summary

total: 7
passed: 2
issues: 5
pending: 0
skipped: 0

## Gaps

- truth: "Subscription page layout with dark-themed cards"
  status: failed
  reason: "User reported: fail remove AG watermark"
  severity: major
  test: 1
  root_cause: "AG watermark span at SubscriptionPage.tsx:278-281 — absolute-positioned 120px 'AG' text at 3% opacity in the plan card"
  artifacts:
    - path: "src/pages/SubscriptionPage.tsx"
      issue: "Lines 278-281: watermark span needs to be deleted"
  missing:
    - "Delete the AG watermark span element"
  debug_session: ""

- truth: "Add-on purchase button calls purchase-addons edge function successfully"
  status: failed
  reason: "User reported: Failed to send a request to the Edge Function"
  severity: blocker
  test: 3
  root_cause: "Edge function not deployed to Supabase and/or required Stripe environment variables (STRIPE_ADDON_WELL_PRICE_ID, STRIPE_ADDON_ADMIN_PRICE_ID, STRIPE_ADDON_METER_CHECKER_PRICE_ID) not set as secrets. Code is correct — this is a deployment issue."
  artifacts:
    - path: "supabase/functions/purchase-addons/index.ts"
      issue: "Function exists but not deployed"
  missing:
    - "Deploy: npx supabase functions deploy purchase-addons"
    - "Set Stripe price ID secrets in Supabase dashboard"
  debug_session: ""

- truth: "Stripe Portal button visible for payment method and invoice management"
  status: failed
  reason: "User reported: no billing portal needed"
  severity: major
  test: 4
  root_cause: "Billing portal JSX at SubscriptionPage.tsx:484-500 and openPortal handler at lines 182-203 should be removed per user request"
  artifacts:
    - path: "src/pages/SubscriptionPage.tsx"
      issue: "Lines 484-500: billing portal section; Lines 182-203: openPortal handler"
  missing:
    - "Remove billing portal JSX section and openPortal handler"
    - "Remove related translation keys (manageSubscription, portalDescription, openPortal)"
  debug_session: ""

- truth: "Cancel subscription link has pointer cursor and cancellation works"
  status: failed
  reason: "User reported: when hovering the cancel subscription, switch to pointer cursor. also there is an error when cancelling the subscription. its not working"
  severity: blocker
  test: 5
  root_cause: "Two issues: (1) Missing cursor-pointer class on cancel button at line 512. (2) Cancel calls openPortal('subscription_cancel') which invokes create-portal-session edge function — likely not deployed or stripe_subscription_id missing in farms table."
  artifacts:
    - path: "src/pages/SubscriptionPage.tsx"
      issue: "Line 512: missing cursor-pointer class"
    - path: "supabase/functions/create-portal-session/index.ts"
      issue: "Subscription cancel flow may fail if stripe_subscription_id missing"
  missing:
    - "Add cursor-pointer class to cancel button"
    - "With portal removed, cancel needs a direct implementation instead of openPortal"
  debug_session: ""

- truth: "Admin users can purchase add-ons on subscription page"
  status: failed
  reason: "User reported: admin should be able to purchase add ons"
  severity: major
  test: 6
  root_cause: "isOwner check at line 161 only includes owner/super_admin. Add-on quantity counters (lines 412-449) and purchase button (lines 454-481) are gated behind isOwner, hiding them from admin role."
  artifacts:
    - path: "src/pages/SubscriptionPage.tsx"
      issue: "Line 161: const isOwner = role === 'owner' || role === 'super_admin' — excludes admin"
  missing:
    - "Include admin role in the purchasing permission check"
  debug_session: ""
