# Testing Patterns

**Analysis Date:** 2026-02-10

## Test Framework

**Status:** No test framework currently configured

**Framework:** Not detected
- No Jest config (`jest.config.*`)
- No Vitest config (`vitest.config.*`)
- No test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`) found in `src/`
- Test framework setup is a future task

**Assertion Library:** Not applicable - no test infrastructure in place

**Run Commands:** Not applicable

---

## Test File Organization

**Expected Pattern (when implemented):**
- **Location:** Co-located with source files
- **Naming:** `[ComponentName].test.tsx` or `[functionName].test.ts` (not separate test directory)
- **Structure:** One test file per component/hook/utility

**Example structure (future):**
```
src/
  hooks/
    useWells.ts
    useWells.test.ts          # Tests co-located
  components/
    MapView.tsx
    MapView.test.tsx
  lib/
    AuthProvider.tsx
    AuthProvider.test.tsx
    powersync-connector.ts
    powersync-connector.test.ts
```

---

## Test Structure

**Suite Organization (when tests are added):**

Based on project conventions, tests should follow this pattern:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'; // When vitest is added
import { renderHook, act } from '@testing-library/react';
import { useWells } from './useWells';

describe('useWells', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Teardown
  });

  it('should return wells for a given farm', () => {
    // Arrange
    // Act
    // Assert
  });

  it('should convert send_monthly_report from 0/1 to boolean', () => {
    // Conversion test
  });
});
```

**Patterns (projected from code structure):**
- **Setup:** Mock PowerSync queries, Supabase calls
- **Teardown:** Clear mocks, reset state
- **Assertion:** Expect specific data shapes, type conversions

---

## Mocking

**Framework:** Not yet configured - would be Vitest + `@testing-library/react` + mocks for:
- PowerSync database (`usePowerSync()`, `useQuery()`)
- Supabase client (auth, RPC calls)
- Browser APIs (geolocation, localStorage, sessionStorage)

**Patterns (to be implemented):**

**PowerSync Mocking (high priority):**
```typescript
// Mock PowerSync queries
vi.mock('@powersync/react', () => ({
  useQuery: vi.fn(),
  usePowerSync: vi.fn(),
}));

// Example usage in test
import { useQuery } from '@powersync/react';
const mockUseQuery = vi.mocked(useQuery);
mockUseQuery.mockReturnValue({
  data: [{ id: '1', name: 'Well 1', send_monthly_report: 1 }],
  isLoading: false,
  error: null,
});
```

**Supabase Mocking:**
```typescript
// Mock Supabase auth and RPC calls
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));
```

**Browser API Mocking:**
```typescript
// Mock geolocation for location-based tests
vi.stubGlobal('navigator', {
  geolocation: {
    getCurrentPosition: vi.fn((success) =>
      success({ coords: { latitude: 38.5, longitude: -98.5 } })
    ),
  },
});

// Mock sessionStorage
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn(),
  setItem: vi.fn(),
});
```

**What to Mock:**
- External API calls (PowerSync, Supabase)
- Browser APIs (geolocation, localStorage, sessionStorage)
- React Router (`useNavigate`, `useLocation`)
- Custom contexts (`useAuth()`)

**What NOT to Mock:**
- Component rendering logic
- Hook state transitions
- Data transformation functions (type conversions like `send_monthly_report === 1`)
- Utility functions that don't have side effects

---

## Fixtures and Factories

**Test Data Pattern (when tests are added):**

Based on codebase structure, create factory functions for test data:

```typescript
// fixtures/wellFactories.ts
export const createWellRow = (overrides?: Partial<WellRow>): WellRow => ({
  id: 'well-123',
  name: 'Test Well',
  status: 'active',
  latitude: 38.5,
  longitude: -98.5,
  meter_serial_number: 'MSN-001',
  wmis_number: 'WMIS-001',
  units: 'AF',
  multiplier: '1',
  send_monthly_report: 1,
  battery_state: 'Ok',
  pump_state: 'Ok',
  meter_status: 'Ok',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createWellWithReading = (overrides?: Partial<WellWithReading>): WellWithReading => ({
  id: 'well-123',
  name: 'Test Well',
  status: 'active',
  location: { latitude: 38.5, longitude: -98.5 },
  meterSerialNumber: 'MSN-001',
  wmisNumber: 'WMIS-001',
  units: 'AF',
  multiplier: '1',
  sendMonthlyReport: true,
  batteryState: 'Ok',
  pumpState: 'Ok',
  meterStatus: 'Ok',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});
```

```typescript
// fixtures/authFactories.ts
export const createAuthContext = (overrides?: Partial<AuthContextType>): AuthContextType => ({
  user: {
    id: 'user-123',
    email: 'test@example.com',
    phone: '+1234567890',
    // ... other User fields
  },
  session: { access_token: 'token-123', ... },
  isAuthReady: true,
  onboardingStatus: {
    hasProfile: true,
    hasFarmMembership: true,
    farmId: 'farm-123',
    farmName: 'Test Farm',
  },
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signOut: vi.fn(),
  refreshOnboardingStatus: vi.fn(),
  ...overrides,
});
```

**Location:**
- `src/__tests__/fixtures/` or similar
- Keep factories close to test files

---

## Coverage

**Requirements:** Not enforced
- No coverage threshold configured
- No coverage tool integrated (Jest/Vitest coverage tools not installed)

**View Coverage (when implemented):**
```bash
vitest --coverage
npm run test:coverage
```

**Target Coverage (recommendation):**
- Utilities and pure functions: 100% coverage required
- Hooks: 80%+ coverage (focus on state transitions)
- Components: 60%+ coverage (integration tests preferable to unit tests)
- Connectors and external integrations: 80%+ (critical error paths)

---

## Test Types

**Unit Tests (when implemented):**
- **Scope:** Individual functions, hooks, utilities
- **Approach:** Test pure functions with various inputs
- **Examples:** `useWells` hook, `resolveNextRoute` utility, `isPermanentError` connector function
- **Tool:** Vitest
- **Priority:** High for business logic, utilities

**Integration Tests (when implemented):**
- **Scope:** Hook + provider interactions, component + context interactions
- **Approach:** Test through React Testing Library with mocked external services
- **Examples:**
  - `useWells` with PowerSync provider
  - `useAuth` with auth state changes
  - `MapView` component with props changes
- **Tool:** Vitest + React Testing Library
- **Priority:** High for main user flows

**E2E Tests:**
- **Status:** Not implemented
- **Framework:** Playwright or Cypress recommended (not currently configured)
- **Scope:** Full user journeys (auth, onboarding, well creation)
- **When to add:** After core features are stable

---

## Common Patterns

**Async Testing (when implemented):**

PowerSync queries are async:
```typescript
import { renderHook, waitFor } from '@testing-library/react';

it('should load wells asynchronously', async () => {
  const { result } = renderHook(() => useWells());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.wells).toHaveLength(2);
  });
});
```

**Error Testing:**

Test error paths in connectors:
```typescript
it('should distinguish permanent errors from retryable errors', () => {
  const permanentError = { code: '23' }; // Constraint violation
  const retryableError = new TypeError('Network error');

  expect(isPermanentError(permanentError)).toBe(true);
  expect(isPermanentError(retryableError)).toBe(false);
});
```

**Form Testing:**

For component forms like `AddWellFormBottomSheet`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should submit form with validated coordinates', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn();

  render(
    <AddWellFormBottomSheet
      open={true}
      onClose={vi.fn()}
      onSave={onSave}
      initialLocation={{ latitude: 38.5, longitude: -98.5 }}
      farmName="Test Farm"
    />
  );

  await user.type(screen.getByLabelText(/name/i), 'Well 1');
  await user.click(screen.getByRole('button', { name: /save/i }));

  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'Well 1',
      latitude: 38.5,
      longitude: -98.5,
    })
  );
});
```

**Context Testing:**

Test AuthProvider with auth state changes:
```typescript
it('should fetch onboarding status on initial session', async () => {
  const mockSupabase = vi.mocked(supabase);
  mockSupabase.rpc.mockResolvedValue({
    data: { has_profile: true, has_farm_membership: true, farm_id: 'farm-1', farm_name: 'Test Farm' },
    error: null,
  });

  const { result } = renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  });

  await waitFor(() => {
    expect(result.current.onboardingStatus).toEqual({
      hasProfile: true,
      hasFarmMembership: true,
      farmId: 'farm-1',
      farmName: 'Test Farm',
    });
  });
});
```

---

## Setup Recommendations

**When adding test infrastructure:**

1. **Install testing dependencies:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/dom @testing-library/user-event
   ```

2. **Create `vitest.config.ts`:**
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./src/__tests__/setup.ts'],
     },
   });
   ```

3. **Create `src/__tests__/setup.ts` for global mocks:**
   ```typescript
   import { vi } from 'vitest';

   // Mock PowerSync
   vi.mock('@powersync/react', () => ({
     useQuery: vi.fn(),
     usePowerSync: vi.fn(),
   }));

   // Mock Supabase
   vi.mock('../lib/supabase', () => ({
     supabase: { /* ... */ },
   }));
   ```

4. **Add test scripts to `package.json`:**
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

---

*Testing analysis: 2026-02-10*
