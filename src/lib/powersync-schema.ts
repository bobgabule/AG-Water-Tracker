import { column, Schema, TableV2 } from '@powersync/web';

const farms = new TableV2({
  name: column.text,
  description: column.text,
  street_address: column.text,
  city: column.text,
  state: column.text,
  zip_code: column.text,
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
  send_monthly_report: column.integer, // boolean as 0/1
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
  is_manual_override: column.integer, // 0/1 boolean
  starting_reading: column.text, // TEXT preserves decimal precision (baseline for usage calc)
  notes: column.text,
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
});

export type Database = (typeof AppSchema)['types'];
export type Farm = Database['farms'];
export type User = Database['users'];
export type FarmMember = Database['farm_members'];
export type FarmInvite = Database['farm_invites'];
export type Well = Database['wells'];
export type ReadingRow = Database['readings'];
export type AllocationRow = Database['allocations'];
