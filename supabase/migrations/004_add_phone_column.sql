-- Add phone column to users table to store the phone number used for OTP login
ALTER TABLE users ADD COLUMN phone TEXT;
