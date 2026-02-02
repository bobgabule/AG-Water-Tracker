-- Enable PostGIS extension for geography/geometry types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create farms table
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invite_code for fast lookups
CREATE INDEX idx_farms_invite_code ON farms(invite_code);

-- Create users table (extends auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_farm_id ON users(farm_id);
CREATE INDEX idx_users_farm_role ON users(farm_id, role);

-- Create wells table
CREATE TABLE wells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
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
CREATE INDEX idx_wells_farm_id ON wells(farm_id);
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
CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
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

-- Trigger to auto-generate invite code on farm creation
CREATE OR REPLACE FUNCTION set_farm_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invite_code BEFORE INSERT ON farms
    FOR EACH ROW EXECUTE FUNCTION set_farm_invite_code();
