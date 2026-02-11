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
  is_disabled: column.integer, // 0 = active, 1 = disabled
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

export const AppSchema = new Schema({
  farms,
  users,
  farm_members,
  farm_invites,
  wells,
});

export type Database = (typeof AppSchema)['types'];
export type Farm = Database['farms'];
export type User = Database['users'];
export type FarmMember = Database['farm_members'];
export type FarmInvite = Database['farm_invites'];
export type Well = Database['wells'];
