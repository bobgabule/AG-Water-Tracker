# Phase 6: Invite System — Research

## Discovery Summary

~90% of the invite system backend and frontend was already implemented in previous phases:

### Already Implemented
- **Database**: `farm_invites` table with phone-based invite columns (migration 019)
- **RPCs**: `invite_user_by_phone`, `revoke_farm_invite`, `get_onboarding_status` with auto-match (migrations 019, 020, 021, 024)
- **Frontend**: `AddUserModal` (invite form), `PendingInvitesList` (invite tracking), integrated in `SettingsPage`
- **SMS**: `send-invite-sms` Edge Function (Twilio-based), already called from AddUserModal
- **Auto-onboarding**: `get_onboarding_status` RPC auto-creates profile + membership when invited user signs in via OTP
- **Permissions**: `manage_invites` action gated to grower/admin/super_admin roles

### Gaps Found
1. **Single name field**: `farm_invites.invited_name` is one column; success criteria requires separate first/last name
2. **Auto-profile incomplete**: `get_onboarding_status` only sets `display_name`, not `first_name`/`last_name`
3. **RPC signature**: `invite_user_by_phone` accepts `p_name` (single); needs `p_first_name`, `p_last_name`
4. **UI**: AddUserModal has single "Name" input; needs separate first/last name fields

### Key Files
| File | Role |
|------|------|
| `supabase/migrations/019_phone_invite_flow.sql` | Original phone invite implementation |
| `supabase/migrations/020_security_definer_private_schema.sql` | Private impl functions |
| `supabase/migrations/024_fix_search_path_and_legacy_cleanup.sql` | Latest private impl versions |
| `src/components/AddUserModal.tsx` | Invite form UI |
| `src/components/PendingInvitesList.tsx` | Invite list display |
| `src/lib/powersync-schema.ts` | PowerSync local schema |
| `supabase/functions/send-invite-sms/index.ts` | SMS Edge Function |
