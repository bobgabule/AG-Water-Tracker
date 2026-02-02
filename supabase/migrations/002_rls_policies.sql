-- Enable RLS on all tables
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Farms policies
-- Users can only see their own farm
CREATE POLICY "Users can view their farm"
    ON farms FOR SELECT
    USING (id IN (
        SELECT farm_id FROM users WHERE id = auth.uid()
    ));

-- Only authenticated users can create farms (during signup)
CREATE POLICY "Authenticated users can create farms"
    ON farms FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only admins can update their farm
CREATE POLICY "Admins can update their farm"
    ON farms FOR UPDATE
    USING (
        id IN (
            SELECT farm_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users policies
-- Users can always view their own record (needed before farm_id is set)
CREATE POLICY "Users can view own record"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Users can view members of their farm
CREATE POLICY "Users can view farm members"
    ON users FOR SELECT
    USING (
        farm_id IN (
            SELECT farm_id FROM users WHERE id = auth.uid()
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
-- Users can view wells in their farm
CREATE POLICY "Users can view farm wells"
    ON wells FOR SELECT
    USING (
        farm_id IN (
            SELECT farm_id FROM users WHERE id = auth.uid()
        )
    );

-- Only admins can create wells
CREATE POLICY "Admins can create wells"
    ON wells FOR INSERT
    WITH CHECK (
        farm_id IN (
            SELECT farm_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update wells
CREATE POLICY "Admins can update wells"
    ON wells FOR UPDATE
    USING (
        farm_id IN (
            SELECT farm_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete wells
CREATE POLICY "Admins can delete wells"
    ON wells FOR DELETE
    USING (
        farm_id IN (
            SELECT farm_id FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allocations policies
-- Users can view allocations for wells in their farm
CREATE POLICY "Users can view farm allocations"
    ON allocations FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Only admins can manage allocations
CREATE POLICY "Admins can create allocations"
    ON allocations FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can update allocations"
    ON allocations FOR UPDATE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can delete allocations"
    ON allocations FOR DELETE
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Readings policies
-- Users can view readings for wells in their farm
CREATE POLICY "Users can view farm readings"
    ON readings FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- All farm members can create readings
CREATE POLICY "Farm members can create readings"
    ON readings FOR INSERT
    WITH CHECK (
        well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Only creator or admin can update readings
CREATE POLICY "Creator or admin can update readings"
    ON readings FOR UPDATE
    USING (
        created_by = auth.uid()
        OR well_id IN (
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users
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
            SELECT id FROM wells WHERE farm_id IN (
                SELECT farm_id FROM users
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );
