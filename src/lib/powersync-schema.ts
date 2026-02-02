import { column, Schema, TableV2 } from '@powersync/web';

const farms = new TableV2({
  name: column.text,
  description: column.text,
  invite_code: column.text,
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

const wells = new TableV2({
  farm_id: column.text,
  name: column.text,
  meter_id: column.text,
  location: column.text,
  status: column.text,
  notes: column.text,
  created_by: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const allocations = new TableV2({
  well_id: column.text,
  year: column.integer,
  acre_feet: column.real,
  notes: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const readings = new TableV2({
  well_id: column.text,
  meter_value: column.real,
  reading_date: column.text,
  gps_latitude: column.real,
  gps_longitude: column.real,
  gps_verified: column.integer,
  notes: column.text,
  created_by: column.text,
  created_at: column.text,
  updated_at: column.text,
});

export const AppSchema = new Schema({
  farms,
  users,
  wells,
  allocations,
  readings,
});

export type Database = (typeof AppSchema)['types'];
export type Farm = Database['farms'];
export type User = Database['users'];
export type Well = Database['wells'];
export type Allocation = Database['allocations'];
export type Reading = Database['readings'];
