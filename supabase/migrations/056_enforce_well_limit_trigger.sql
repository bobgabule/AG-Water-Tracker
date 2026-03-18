-- =============================================================================
-- Migration 056: Enforce well limit via BEFORE INSERT trigger
-- =============================================================================
-- Well limits were only enforced client-side. When offline, the client allows
-- well creation past the limit because subscription tier data is unavailable.
-- On sync, the INSERT succeeds because Supabase had no server-side check.
--
-- Fix: BEFORE INSERT trigger on wells that counts existing wells for the farm
-- and rejects the INSERT if the subscription tier limit is reached.
-- Uses ERRCODE '23514' (CHECK VIOLATION) so the PowerSync connector's
-- isPermanentError() catches it and rolls back the optimistic local well.
-- =============================================================================

-- Idempotency guards
DROP TRIGGER IF EXISTS enforce_well_limit_trigger ON public.wells;
DROP FUNCTION IF EXISTS private.enforce_well_limit();

CREATE OR REPLACE FUNCTION private.enforce_well_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_current_count   INTEGER;
    v_max_wells       INTEGER;
    v_extra_wells     INTEGER;
    v_effective_limit INTEGER;
BEGIN
    -- Advisory lock keyed on farm_id prevents two concurrent INSERTs for the
    -- same farm from both reading the same count under READ COMMITTED isolation.
    -- Transaction-scoped: released automatically on COMMIT/ROLLBACK.
    PERFORM pg_advisory_xact_lock(hashtext(NEW.farm_id::text));

    SELECT COUNT(*) INTO v_current_count
    FROM public.wells
    WHERE farm_id = NEW.farm_id;

    SELECT st.max_wells, f.extra_wells
    INTO v_max_wells, v_extra_wells
    FROM public.farms f
    JOIN public.subscription_tiers st ON st.slug = f.subscription_tier
    WHERE f.id = NEW.farm_id;

    IF v_max_wells IS NULL THEN
        RAISE EXCEPTION 'Farm subscription tier not found for farm %', NEW.farm_id
            USING ERRCODE = '23514';
    END IF;

    v_effective_limit := COALESCE(v_max_wells, 0) + COALESCE(v_extra_wells, 0);

    IF v_current_count >= v_effective_limit THEN
        RAISE EXCEPTION 'Well limit reached: % of % allowed',
            v_current_count, v_effective_limit
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_well_limit_trigger
    BEFORE INSERT ON public.wells
    FOR EACH ROW
    EXECUTE FUNCTION private.enforce_well_limit();

NOTIFY pgrst, 'reload schema';
