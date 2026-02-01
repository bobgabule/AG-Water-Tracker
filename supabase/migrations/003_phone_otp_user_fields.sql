-- Add profile fields for phone OTP registration flow
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN email TEXT;

-- Auto-populate display_name from first + last name
CREATE OR REPLACE FUNCTION set_display_name_from_names()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
        NEW.display_name := NEW.first_name || ' ' || NEW.last_name;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_display_name
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_display_name_from_names();
