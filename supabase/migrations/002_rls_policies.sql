-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

-- Organizations policies (displayed as "Farms" in the application UI)
-- Users can only see their own farm
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
CREATE POLICY "Users can view org members"
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
CREATE POLICY "Users can view org wells"
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
CREATE POLICY "Users can view org allocations"
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
CREATE POLICY "Users can view org readings"
    ON readings FOR SELECT
    USING (
        well_id IN (
            SELECT id FROM wells WHERE organization_id IN (
                SELECT organization_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- All org members can create readings
CREATE POLICY "Org members can create readings"
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
