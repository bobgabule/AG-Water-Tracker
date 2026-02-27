import { column, Schema, TableV2 } from '@powersync/web';

const farms = new TableV2({
  name: column.text,
  subscription_tier: column.text,
  street_address: column.text,
  city: column.text,
  state: column.text,
  zip_code: column.text,
  extra_admin_seats: column.integer,
  extra_meter_checker_seats: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const users = new TableV2({
  farm_id: column.text,
  role: column.text,
  display_name: column.text,
  first_name: column.text,
  last_name: column.text,
  email: column.text,
  phone: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const farm_members = new TableV2({
  farm_id: column.text,
  user_id: column.text,
  role: column.text,
  full_name: column.text, // Denormalized from users.display_name
  created_at: column.text,
});

const farm_invites = new TableV2({
  code: column.text,
  farm_id: column.text,
  role: column.text,
  invited_phone: column.text,
  invited_first_name: column.text,
  invited_last_name: column.text,
  invited_email: column.text,
  expires_at: column.text,
  max_uses: column.integer,
  uses_count: column.integer,
  created_by: column.text,
  created_at: column.text,
});

const wells = new TableV2({
  farm_id: column.text,
  name: column.text,
  meter_serial_number: column.text,
  wmis_number: column.text,
  latitude: column.real,
  longitude: column.real,
  units: column.text,
  multiplier: column.text,
  battery_state: column.text,
  pump_state: column.text,
  meter_status: column.text,
  status: column.text,
  created_by: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const readings = new TableV2({
  well_id: column.text,
  farm_id: column.text, // denormalized for sync rules filtering
  value: column.text, // TEXT preserves decimal precision (v2.0 decision)
  recorded_by: column.text,
  recorded_at: column.text,
  gps_latitude: column.real,
  gps_longitude: column.real,
  is_in_range: column.integer, // 0/1 boolean (PowerSync has no BOOLEAN)
  is_similar_reading: column.integer, // 0/1 boolean — reading within 50gal of prior
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const allocations = new TableV2({
  well_id: column.text,
  farm_id: column.text, // denormalized for sync rules filtering
  period_start: column.text,
  period_end: column.text,
  allocated_af: column.text, // TEXT preserves decimal precision
  used_af: column.text, // TEXT preserves decimal precision
  starting_reading: column.text, // TEXT preserves decimal precision (baseline for usage calc)
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const subscription_tiers = new TableV2({
  display_name: column.text,
  max_admins: column.integer,
  max_meter_checkers: column.integer,
  max_wells: column.integer,
  sort_order: column.integer,
  created_at: column.text,
  updated_at: column.text,
});

const app_settings = new TableV2({
  value: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const report_email_recipients = new TableV2({
  farm_id: column.text,
  email: column.text,
  is_auto_added: column.integer, // 0/1 boolean (PowerSync has no BOOLEAN)
  source_user_id: column.text,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  farms,
  users,
  farm_members,
  farm_invites,
  wells,
  readings,
  allocations,
  subscription_tiers,
  app_settings,
  report_email_recipients,
});

export type Database = (typeof AppSchema)['types'];
export type Farm = Database['farms'];
export type User = Database['users'];
export type FarmMember = Database['farm_members'];
export type FarmInvite = Database['farm_invites'];
export type Well = Database['wells'];
export type ReadingRow = Database['readings'];
export type AllocationRow = Database['allocations'];
export type SubscriptionTier = Database['subscription_tiers'];
export type AppSetting = Database['app_settings'];
export type ReportEmailRecipient = Database['report_email_recipients'];
