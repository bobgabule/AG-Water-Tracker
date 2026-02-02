-- Allow users to SELECT their own record (fixes registration redirect bug)
-- Without this, newly registered users with farm_id=NULL cannot read their
-- own profile because the existing "farm members" policy uses a NULL-unsafe check.
CREATE POLICY "Users can view own record"
    ON users FOR SELECT
    USING (id = auth.uid());
