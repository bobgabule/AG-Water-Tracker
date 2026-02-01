# API & Database Reference - AG Water Tracker

This document provides complete database schema, SQL migrations, Row Level Security policies, and API endpoint documentation.

## Database Schema

### Overview

The database consists of 5 main tables organized to support multi-tenant farms with wells, allocations, and readings.

```
organizations (multi-tenant root)
    â†“
  users (members of organizations)
    â†“
  wells (located via GPS, belong to organizations)
    â†“
  allocations (annual water allocation per well)
    â†“
  readings (meter readings with GPS verification)
```

### Table: `organizations` (represents Farms in the UI)

Farms are the multi-tenant root (stored in the `organizations` table). Each farm has multiple users and wells.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique organization ID |
| `name` | `text` | NOT NULL | Farm name |
| `description` | `text` | NULL | Optional description |
| `invite_code` | `text` | UNIQUE | 6-character code for joining org |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE on `invite_code`
- INDEX on `invite_code` for fast lookups

### Table: `users`

Extends Supabase `auth.users` with farm membership.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, REFERENCES auth.users(id) | User ID (matches auth.users) |
| `organization_id` | `uuid` | REFERENCES organizations(id) ON DELETE CASCADE | farm membership |
| `role` | `text` | NOT NULL, DEFAULT 'member' | Role: 'admin' or 'member' |
| `display_name` | `text` | NULL | Optional display name |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id` for filtering
- INDEX on `(organization_id, role)` for permission checks

**Roles:**
- `admin`: Can create/edit/delete wells, manage users
- `member`: Can view wells and add readings

### Table: `wells`

Water wells with GPS location (PostGIS geometry).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique well ID |
| `organization_id` | `uuid` | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Owner farm |
| `name` | `text` | NOT NULL | Well name/identifier |
| `meter_id` | `text` | NULL | Physical meter ID |
| `location` | `geography(Point, 4326)` | NOT NULL | GPS coordinates (PostGIS) |
| `status` | `text` | NOT NULL, DEFAULT 'alive' | Status: 'alive' or 'dead' |
| `notes` | `text` | NULL | Optional notes |
| `created_by` | `uuid` | REFERENCES users(id) | Creator user ID |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- SPATIAL INDEX on `location` (for GPS range queries)
- INDEX on `status`

**Status Values:**
- `alive`: Well is active
- `dead`: Well is inactive/decommissioned

### Table: `allocations`

Annual water allocation for each well (in acre-feet).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique allocation ID |
| `well_id` | `uuid` | NOT NULL, REFERENCES wells(id) ON DELETE CASCADE | Associated well |
| `year` | `integer` | NOT NULL | Allocation year (e.g., 2024) |
| `acre_feet` | `numeric(10,2)` | NOT NULL | Allocated amount in acre-feet |
| `notes` | `text` | NULL | Optional notes |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Constraints:**
- UNIQUE on `(well_id, year)` - one allocation per well per year
- CHECK `acre_feet > 0` - must be positive

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `(well_id, year)`
- INDEX on `year`

### Table: `readings`

Meter readings with GPS verification.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique reading ID |
| `well_id` | `uuid` | NOT NULL, REFERENCES wells(id) ON DELETE CASCADE | Associated well |
| `meter_value` | `numeric(15,2)` | NOT NULL | Meter reading value (gallons) |
| `reading_date` | `timestamptz` | NOT NULL, DEFAULT now() | Date/time of reading |
| `gps_latitude` | `numeric(10,8)` | NULL | GPS latitude when reading taken |
| `gps_longitude` | `numeric(11,8)` | NULL | GPS longitude when reading taken |
| `gps_verified` | `boolean` | DEFAULT false | True if GPS within range of well |
| `notes` | `text` | NULL | Optional notes |
| `created_by` | `uuid` | REFERENCES users(id) | User who created reading |
| `created_at` | `timestamptz` | DEFAULT now() | Creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT now() | Last update timestamp |

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `well_id`
- INDEX on `reading_date` (for date range queries)
- INDEX on `(well_id, reading_date DESC)` (for latest reading queries)

**Data Validation:**
- `meter_value` should be greater than previous reading for the same well
- GPS coordinates should be within configurable range of well location

---

## SQL Migrations

### Migration 001: Initial Schema

**File**: `supabase/migrations/001_initial_schema.sql`

```sql
-- Enable PostGIS extension for geography/geometry types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invite_code for fast lookups
CREATE INDEX idx_organizations_invite_code ON organizations(invite_code);

-- Create users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_org_role ON users(organization_id, role);

-- Create wells table
CREATE TABLE wells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    meter_id TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'dead')),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for wells
CREATE INDEX idx_wells_organization_id ON wells(organization_id);
CREATE INDEX idx_wells_status ON wells(status);
CREATE INDEX idx_wells_location ON wells USING GIST(location);

-- Create allocations table
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    acre_feet NUMERIC(10,2) NOT NULL CHECK (acre_feet > 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(well_id, year)
);

-- Indexes for allocations
CREATE UNIQUE INDEX idx_allocations_well_year ON allocations(well_id, year);
CREATE INDEX idx_allocations_year ON allocations(year);

-- Create readings table
CREATE TABLE readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    well_id UUID NOT NULL REFERENCES wells(id) ON DELETE CASCADE,
    meter_value NUMERIC(15,2) NOT NULL,
    reading_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gps_latitude NUMERIC(10,8),
    gps_longitude NUMERIC(11,8),
    gps_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for readings
CREATE INDEX idx_readings_well_id ON readings(well_id);
CREATE INDEX idx_readings_date ON readings(reading_date);
CREATE INDEX idx_readings_well_date ON readings(well_id, reading_date DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach updated_at triggers to all tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wells_updated_at BEFORE UPDATE ON wells
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_allocations_updated_at BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_readings_updated_at BEFORE UPDATE ON readings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate random invite code (6 characters, alphanumeric)
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite code on organization creation
CREATE OR REPLACE FUNCTION set_organization_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_code BEFORE INSERT ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_organization_invite_code();
```

### Migration 002: Row Level Security (RLS) Policies

**File**: `supabase/migrations/002_rls_policies.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Organizations policies
-- Users can only see their own organization
CREATE POLICY "Users can view their organization"
    ON organizations FOR SELECT
    USING (id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

-- Only authenticated users can create organizations (during signup)
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only admins can update their organization
CREATE POLICY "Admins can update their organization"
    ON organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users policies
-- Users can view members of their organization
CREATE POLICY "Users can view farm members"
    ON users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can create their own user record (during signup)
CREATE POLICY "Users can create own record"
    ON users FOR INSERT
    WITH CHECK (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update own record"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Wells policies
-- Users can view wells in their organization
CREATE POLICY "Users can view farm wells"
    ON wells FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Only admins can create wells
CREATE POLICY "Admins can create wells"
    ON wells FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update wells
CREATE POLICY "Admins can update wells"
    ON wells FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete wells
CREATE POLICY "Admins can delete wells"
    ON wells FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allocations policies
-- Users can view allocations for wells in their org
CREATE POLICY "Users can view farm allocations"
    ON allocations FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Only admins can manage allocations
CREATE POLICY "Admins can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can update allocations"
    ON allocations FOR UPDATE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can delete allocations"
    ON allocations FOR DELETE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Readings policies
-- Users can view readings for wells in their org
CREATE POLICY "Users can view farm readings"
    ON readings FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- All farm members can create readings
CREATE POLICY "farm members can create readings"
    ON readings FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Only creator or admin can update readings
CREATE POLICY "Creator or admin can update readings"
    ON readings FOR UPDATE
    USING (
        created_by = auth.uid()
        OR well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Only creator or admin can delete readings
CREATE POLICY "Creator or admin can delete readings"
    ON readings FOR DELETE
    USING (
        created_by = auth.uid()
        OR well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );
```

---

## PowerSync Sync Rules

PowerSync needs sync rules to determine what data to sync to each user's device.

**Configuration** (PowerSync Dashboard â†’ Sync Rules):

```yaml
bucket_definitions:
  user_org_data:
    # Parameter query: determines which bucket(s) the user belongs to
    parameters: SELECT request.user_id() as user_id

    # Data queries: what data is synced into this bucket
    data:
      # Sync user's organization
      - SELECT o.* FROM organizations o
        WHERE o.id IN (SELECT organization_id FROM users WHERE id = bucket.user_id)

      # Sync farm members
      - SELECT u.* FROM users u
        WHERE u.organization_id IN (SELECT organization_id FROM users WHERE id = bucket.user_id)

      # Sync all wells from user's organization
      - SELECT w.* FROM wells w
        WHERE w.organization_id IN (SELECT organization_id FROM users WHERE id = bucket.user_id)

      # Sync all allocations for farm wells
      - SELECT a.* FROM allocations a
        WHERE a.well_id IN (SELECT id FROM wells WHERE organization_id IN (SELECT organization_id FROM users WHERE id = bucket.user_id))

      # Sync all readings for farm wells
      - SELECT r.* FROM readings r
        WHERE r.well_id IN (SELECT id FROM wells WHERE organization_id IN (SELECT organization_id FROM users WHERE id = bucket.user_id))
```

**Notes**:
- `request.user_id()` returns the authenticated user's ID from the JWT subject claim
- `bucket.user_id` references the parameter defined in the `parameters` query
- PowerSync sync rules use a subset of SQL â€” no JOIN, GROUP BY, ORDER BY, or LIMIT
- See [PowerSync Sync Rules docs](https://docs.powersync.com/usage/sync-rules) for full syntax reference

---

## Data Validation Rules

### Wells
- `name`: Required, 1-100 characters
- `location`: Required, valid GPS coordinates (lat: -90 to 90, lon: -180 to 180)
- `status`: Must be 'alive' or 'dead'

### Allocations
- `acre_feet`: Required, must be > 0, max 2 decimal places
- `year`: Required, must be >= current year - 10 and <= current year + 5

### Readings
- `meter_value`: Required, must be >= 0, max 2 decimal places
- `meter_value`: Should be > previous reading for same well (warning, not error)
- `reading_date`: Required, cannot be in the future
- GPS coordinates: If provided, must be valid (-90 to 90, -180 to 180)
- `gps_verified`: Auto-calculated based on distance from well (<100m by default)

---

## API Endpoints Reference

### Authentication

Uses Supabase Auth. All endpoints require authentication via Bearer token.

**Sign Up**
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
});
```

**Sign In**
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
});
```

**Sign Out**
```javascript
const { error } = await supabase.auth.signOut();
```

### Farms

**Register Farm**
```javascript
const { data, error } = await supabase
  .from('organizations')
  .insert({
    name: 'Acme Farms',
    description: 'Family-owned farm in Central Valley'
  })
  .select()
  .single();

// Returns: { id, name, description, invite_code, created_at, updated_at }
```

**Get Farm by Invite Code**
```javascript
const { data, error } = await supabase
  .from('organizations')
  .select('*')
  .eq('invite_code', 'ABC123')
  .single();
```

**Update Farm**
```javascript
const { data, error } = await supabase
  .from('organizations')
  .update({ name: 'New Name' })
  .eq('id', organizationId)
  .select()
  .single();
```

### Users

**Create User Record (after signup)**
```javascript
const { data, error } = await supabase
  .from('users')
  .insert({
    id: authUserId,  // From auth.users
    organization_id: orgId,
    role: 'member',
    display_name: 'John Doe'
  })
  .select()
  .single();
```

**Get Current User with Org**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('*, organization:organizations(*)')
  .eq('id', authUserId)
  .single();
```

**List Organization Members**
```javascript
const { data, error } = await supabase
  .from('users')
  .select('id, display_name, role, created_at')
  .eq('organization_id', orgId);
```

### Wells

**Create Well**
```javascript
const { data, error } = await supabase
  .from('wells')
  .insert({
    organization_id: orgId,
    name: 'North Field Well #1',
    meter_id: 'M-12345',
    location: `POINT(${longitude} ${latitude})`,  // PostGIS format
    status: 'alive',
    created_by: userId
  })
  .select()
  .single();
```

**List Wells for Organization**
```javascript
const { data, error } = await supabase
  .from('wells')
  .select('*')
  .eq('organization_id', orgId)
  .order('name');
```

**Get Well with Latest Reading**
```javascript
const { data, error } = await supabase
  .from('wells')
  .select(`
    *,
    latest_reading:readings(meter_value, reading_date, gps_verified)
  `)
  .eq('id', wellId)
  .order('readings.reading_date', { ascending: false })
  .limit(1)
  .single();
```

**Update Well**
```javascript
const { data, error } = await supabase
  .from('wells')
  .update({ status: 'dead', notes: 'Pump failed' })
  .eq('id', wellId)
  .select()
  .single();
```

### Allocations

**Set Annual Allocation**
```javascript
const { data, error } = await supabase
  .from('allocations')
  .upsert({  // upsert updates if (well_id, year) exists
    well_id: wellId,
    year: 2024,
    acre_feet: 150.50,
    notes: 'State-approved allocation'
  })
  .select()
  .single();
```

**Get Allocation for Year**
```javascript
const { data, error } = await supabase
  .from('allocations')
  .select('*')
  .eq('well_id', wellId)
  .eq('year', 2024)
  .single();
```

### Readings

**Create Reading**
```javascript
const { data, error } = await supabase
  .from('readings')
  .insert({
    well_id: wellId,
    meter_value: 12345.67,
    reading_date: new Date().toISOString(),
    gps_latitude: 36.7783,
    gps_longitude: -119.4179,
    gps_verified: true,  // Calculated client-side
    notes: 'Monthly reading',
    created_by: userId
  })
  .select()
  .single();
```

**List Readings for Well**
```javascript
const { data, error } = await supabase
  .from('readings')
  .select('*')
  .eq('well_id', wellId)
  .order('reading_date', { ascending: false })
  .limit(50);
```

**Get Latest Reading**
```javascript
const { data, error } = await supabase
  .from('readings')
  .select('*')
  .eq('well_id', wellId)
  .order('reading_date', { ascending: false })
  .limit(1)
  .single();
```

---

## Example Queries

### Calculate Total Usage for a Well This Year

```javascript
const { data, error } = await supabase
  .from('readings')
  .select('meter_value')
  .eq('well_id', wellId)
  .gte('reading_date', `${new Date().getFullYear()}-01-01`)
  .order('reading_date', { ascending: true });

if (data && data.length >= 2) {
  const firstReading = data[0].meter_value;
  const lastReading = data[data.length - 1].meter_value;
  const usageGallons = lastReading - firstReading;
  const usageAcreFeet = usageGallons / 325851;  // Conversion factor
}
```

### Find Wells Within Radius of GPS Coordinates

```javascript
// Note: Uses PostGIS ST_DWithin function
const { data, error } = await supabase
  .rpc('wells_within_radius', {
    lat: 36.7783,
    lon: -119.4179,
    radius_meters: 1000
  });

// RPC function (create in Supabase SQL Editor):
/*
CREATE OR REPLACE FUNCTION wells_within_radius(lat FLOAT, lon FLOAT, radius_meters INT)
RETURNS SETOF wells AS $$
  SELECT * FROM wells
  WHERE ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
    radius_meters
  );
$$ LANGUAGE SQL;
*/
```

### Get Usage Summary for Organization

```javascript
const { data, error } = await supabase
  .rpc('get_org_usage_summary', {
    org_id: organizationId,
    year: 2024
  });

// Returns: { well_name, allocated_acre_feet, used_acre_feet, percent_used }
```

---

## Error Handling

### Common Errors

**23505: Unique Violation**
```
duplicate key value violates unique constraint "allocations_well_id_year_key"
```
**Solution**: Well already has allocation for that year. Use `upsert()` instead of `insert()`.

**42501: Insufficient Privilege**
```
new row violates row-level security policy for table "wells"
```
**Solution**: User doesn't have permission. Check RLS policies and user role.

**23503: Foreign Key Violation**
```
insert or update on table "wells" violates foreign key constraint
```
**Solution**: Referenced organization/user doesn't exist. Verify IDs.

---

**For architectural details and component structure, see [ARCHITECTURE.md](ARCHITECTURE.md).**
