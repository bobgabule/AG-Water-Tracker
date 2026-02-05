# Well Creation Implementation Plan

## Overview
Implement well creation functionality with database schema, PowerSync sync, and redesigned map markers.

---

## Module 1: Database Migration

**File to create:** `supabase/migrations/017_create_wells_table.sql`

### Requirements
Create wells table with these columns:

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY DEFAULT gen_random_uuid() |
| farm_id | UUID | NOT NULL REFERENCES farms(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| meter_serial_number | TEXT | |
| wmis_number | TEXT | |
| latitude | NUMERIC(10,8) | NOT NULL |
| longitude | NUMERIC(11,8) | NOT NULL |
| units | TEXT | NOT NULL DEFAULT 'AF' CHECK (units IN ('AF', 'GAL', 'CF')) |
| multiplier | TEXT | NOT NULL DEFAULT '1' CHECK (multiplier IN ('0.01', '1', '10', '1000', 'MG')) |
| send_monthly_report | BOOLEAN | NOT NULL DEFAULT true |
| battery_state | TEXT | NOT NULL DEFAULT 'Unknown' |
| pump_state | TEXT | NOT NULL DEFAULT 'Unknown' |
| meter_status | TEXT | NOT NULL DEFAULT 'Unknown' |
| status | TEXT | NOT NULL DEFAULT 'active' |
| created_by | UUID | REFERENCES auth.users(id) |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

### Include
- Index on `farm_id`
- Index on `status`
- Trigger for `updated_at` using existing `update_updated_at_column()` function
- RLS policies:
  - Members can SELECT (use `get_user_farm_ids()`)
  - Owners/admins can INSERT/UPDATE/DELETE (use `get_user_admin_farm_ids()`)

### Acceptance Criteria
- Migration file created and valid SQL
- Run `npx supabase db push` successfully

---

## Module 2: PowerSync Schema

**File to modify:** `src/lib/powersync-schema.ts`

### Requirements
Add wells table definition following existing patterns:

```typescript
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
```

### Changes
1. Add `wells` table definition after `farm_invites`
2. Add `wells` to `AppSchema` export
3. Add `export type Well = Database['wells'];`

### Acceptance Criteria
- No TypeScript errors: `npx tsc -b --noEmit`

---

## Module 3: PowerSync Sync Rules

**File to modify:** `docs/powersync-sync-rules.yaml`

### Requirements
Add new bucket definition for wells:

```yaml
farm_wells:
  parameters: SELECT farm_id FROM farm_members WHERE user_id = request.user_id()
  data:
    - SELECT id, farm_id, name, meter_serial_number, wmis_number, latitude, longitude, units, multiplier, send_monthly_report, battery_state, pump_state, meter_status, status, created_by, created_at, updated_at FROM wells WHERE farm_id = bucket.farm_id
```

### Acceptance Criteria
- Valid YAML syntax
- Follows existing bucket patterns

---

## Module 4: useWells Hook Update

**File to modify:** `src/hooks/useWells.ts`

### Requirements
Update hook for new schema (simple lat/lng instead of PostGIS):

1. Update `WellRow` interface:
```typescript
interface WellRow {
  id: string;
  name: string;
  status: string;
  latitude: number;
  longitude: number;
  meter_serial_number: string | null;
  wmis_number: string | null;
  units: string;
  multiplier: string;
  send_monthly_report: number;
  battery_state: string;
  pump_state: string;
  meter_status: string;
  created_at: string;
  updated_at: string;
}
```

2. Update `WellWithReading` interface:
```typescript
export interface WellWithReading {
  id: string;
  name: string;
  status: string;
  location: WellLocation | null;
  meterSerialNumber: string | null;
  wmisNumber: string | null;
  units: string;
  multiplier: string;
  sendMonthlyReport: boolean;
  batteryState: string;
  pumpState: string;
  meterStatus: string;
  createdAt: string;
  updatedAt: string;
}
```

3. Update SQL query (remove readings subquery, use direct lat/lng):
```typescript
const query = farmId
  ? `SELECT id, name, status, latitude, longitude, meter_serial_number,
     wmis_number, units, multiplier, send_monthly_report, battery_state,
     pump_state, meter_status, created_at, updated_at
     FROM wells WHERE farm_id = ? ORDER BY name`
  : 'SELECT NULL WHERE 0';
```

4. Update mapping in `useMemo`:
- Read `latitude`/`longitude` directly (no JSON parsing)
- Map snake_case to camelCase
- Convert `send_monthly_report` (0/1) to boolean

5. Remove `parseLocation` function (no longer needed)

### Acceptance Criteria
- No TypeScript errors
- Hook returns wells with location from direct lat/lng columns

---

## Module 5: DashboardPage Save Logic

**File to modify:** `src/pages/DashboardPage.tsx`

### Requirements
Implement `handleSaveWell` to insert well via PowerSync:

1. Add imports:
```typescript
import { usePowerSync } from '@powersync/react';
```

2. Get database instance:
```typescript
const db = usePowerSync();
```

3. Get user from auth:
```typescript
const { user, onboardingStatus } = useAuth();
```

4. Update `handleSaveWell`:
```typescript
const handleSaveWell = useCallback(async (wellData: WellFormData) => {
  const farmId = onboardingStatus?.farmId;
  if (!farmId || !user) {
    console.error('Cannot save well: missing farmId or user');
    return;
  }

  const wellId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.execute(
      `INSERT INTO wells (
        id, farm_id, name, meter_serial_number, wmis_number,
        latitude, longitude, units, multiplier, send_monthly_report,
        battery_state, pump_state, meter_status, status, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        wellId,
        farmId,
        wellData.name,
        wellData.meterSerialNumber,
        wellData.wmisNumber,
        wellData.latitude,
        wellData.longitude,
        wellData.units,
        wellData.multiplier,
        wellData.sendMonthlyReport ? 1 : 0,
        wellData.batteryState,
        wellData.pumpState,
        wellData.meterStatus,
        'active',
        user.id,
        now,
        now,
      ]
    );

    setCurrentStep('closed');
    setPickedLocation(null);
  } catch (error) {
    console.error('Failed to save well:', error);
  }
}, [db, onboardingStatus?.farmId, user]);
```

### Acceptance Criteria
- No TypeScript errors
- Well saves to local PowerSync database
- Form closes after save
- Well appears on map (via reactive useWells query)

---

## Module 6: WellMarker Redesign

**File to modify:** `src/components/WellMarker.tsx`

### Requirements
Redesign marker to match reference UI with:

1. **Water Gauge** - Vertical bar showing allocation percentage
   - Blue gradient fill: `bg-gradient-to-t from-blue-600 to-cyan-400`
   - Empty portion: dark gray or transparent
   - Newly added wells: 100% full

2. **Map Pin** - Green/teal pin icon

3. **Info Overlay** - Rounded dark rectangle
   - Well name (bold, white, small text)
   - Status text (smaller, muted white)

### Status Text Logic
Update to show:
- "Newly added" - when `updatedAt` equals `createdAt` (never been updated)
- "Updated Today" - updated within last 24 hours
- "Updated Yesterday" - updated 24-48 hours ago
- "Updated N days ago" - for older updates
- "Updated N weeks ago" - for 7+ days

### Visual Structure
```
     ┌──┬───┐
     │██│ 📍│  ← Gauge + Pin side by side
     │██│   │
     │░░│   │
     └──┴───┘
  ┌──────────┐
  │ Well 1   │  ← Info overlay
  │ Updated  │
  └──────────┘
```

### Update Props
Add `createdAt` and `updatedAt` to the `WellWithReading` type usage.

### Gauge Calculation
For now (no allocations table):
- All wells show 100% full gauge
- Later: calculate from `used / allocated`

### Acceptance Criteria
- Marker displays with gauge, pin, and info overlay
- Blue gradient on gauge
- Status shows "Newly added" for new wells
- No TypeScript errors
- Wrapped in `React.memo` for performance

---

## Verification Checklist

After all modules complete:

1. [ ] Run `npx supabase db push` - migration applies
2. [ ] Run `npx tsc -b --noEmit` - no type errors
3. [ ] Run `npm run dev` - app starts
4. [ ] Click "New Well" → pick location → fill form → save
5. [ ] Verify well marker appears on map with new UI
6. [ ] Verify gauge shows 100% blue
7. [ ] Verify status shows "Newly added"
8. [ ] Test offline: create well offline, verify sync when back online
