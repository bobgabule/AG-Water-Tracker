# Coding Conventions

**Analysis Date:** 2026-02-10

## Naming Patterns

**Files:**
- Components: `PascalCase.tsx` (e.g., `MapView.tsx`, `Header.tsx`)
- Utilities/Hooks: `camelCase.ts` or `camelCase.tsx` (e.g., `useWells.ts`, `powersync-connector.ts`)
- Types: Defined in `types/` folder or as separate files (e.g., `OnboardingStatus` exported from `lib/AuthProvider.tsx`)
- Database/Schema files: `kebab-case.ts` (e.g., `powersync-schema.ts`, `powersync-connector.ts`)

**Functions:**
- React components: `PascalCase` (e.g., `function Header()`, `export default function MapView()`)
- Utility functions: `camelCase` (e.g., `resolveNextRoute()`, `isOnboardingComplete()`, `setupPowerSync()`)
- Private methods: `camelCase` with underscore prefix (e.g., `_normalizeForSupabase()`, `_applyOperation()`)
- Event handlers: `handleXxx` convention (e.g., `handleAuthStateChange`, `handleMapClick`, `handleSaveWell`)
- Callbacks: `onXxx` for props, `handleXxx` for internal handlers (e.g., `onClose`, `onMapClick`, `handleDismissBanner`)

**Variables & State:**
- React state: `camelCase` (e.g., `const [name, setName]`, `const [isSaving, setIsSaving]`)
- Boolean variables: prefix with `is`, `has`, or `can` (e.g., `isAuthReady`, `hasFarmMembership`, `isPickingLocation`)
- DOM refs: `camelCase` with `Ref` suffix (e.g., `mapRef`, `pressTimerRef`, `errorTimeoutRef`)
- Database column names: `snake_case` (e.g., `send_monthly_report`, `meter_serial_number`, `farm_id`)
- Type-mapped names: Convert snake_case DB columns to camelCase in TypeScript (e.g., `sendMonthlyReport`, `meterSerialNumber`)

**Types:**
- Interfaces: `PascalCase` (e.g., `AuthContextType`, `WellWithReading`, `WellRow`, `MapViewProps`)
- Enums: Not used in current codebase; use union types instead (e.g., `'AF' | 'GAL' | 'CF'`)
- Database type exports: `PascalCase` mapped from schema (e.g., `export type Well = Database['wells']`)

**Constants:**
- ALL_CAPS for module-level constants (e.g., `DEFAULT_ZOOM`, `BANNER_DISMISSED_KEY`, `ALLOWED_TABLES`)
- Short descriptive names without overly verbose prefixes

## Code Style

**Formatting:**
- Prettier is configured by default (Vite + React setup)
- Line length: No explicit limit in config, but follows modern practices (~80-100 char lines)
- Indentation: 2 spaces
- Quotes: Single quotes for strings (Prettier default in JS/TS)
- Semicolons: Required (Prettier default)
- Trailing commas: ES5 style (Prettier default)

**Linting:**
- ESLint config: `eslint.config.js` using flat config format
- Active plugins:
  - `@eslint/js` - Core JS rules
  - `typescript-eslint` - TS-specific rules (recommended config)
  - `eslint-plugin-react-hooks` - React hooks rules (enforces dependency arrays)
  - `eslint-plugin-react-refresh` - React refresh compatibility
- TypeScript strict mode: Enabled
  - `strict: true` - All strict options on
  - `noUnusedLocals: true` - Fails on unused variables
  - `noUnusedParameters: true` - Fails on unused function parameters
  - `noFallthroughCasesInSwitch: true` - Switch case fallthrough forbidden
  - `noUncheckedSideEffectImports: true` - Requires explicit side-effect imports

## Import Organization

**Order:**
1. React/third-party library imports (`import React from 'react'`, `import { useState } from 'react'`)
2. Third-party UI/styling imports (`import { Dialog } from '@headlessui/react'`, `import 'mapbox-gl/dist/mapbox-gl.css'`)
3. Third-party utility imports (`import { useQuery } from '@powersync/react'`)
4. Local component imports (`import MapView from './MapView'`, `import Header from './Header'`)
5. Local hook/utility imports (`import { useWells } from '../hooks/useWells'`, `import { useAuth } from '../lib/AuthProvider'`)
6. Type imports (e.g., `import type { WellWithReading } from '../hooks/useWells'`)
7. CSS/style imports last if not at top

**Path Aliases:**
- Aliases not explicitly configured in current codebase
- Use relative paths (`../`, `./`) consistently
- File extensions (`.ts`, `.tsx`) are included in imports: `import { supabase } from './supabase.ts'`

**Type Imports:**
- Use `import type` for type-only imports (e.g., `import type { MapRef, MapMouseEvent } from 'react-map-gl/mapbox'`)
- Separates type imports from value imports for clarity

## Error Handling

**Patterns:**
- Try-catch blocks with console.error logging (e.g., in `AuthProvider.tsx`)
- Destructuring error objects from async calls: `const { data, error } = await supabase.rpc('...')`
- Validation of error conditions before throwing (e.g., `if (!session) { throw new Error('Not authenticated') }`)
- Error context included in messages (e.g., `'Failed to fetch onboarding status:', error`)
- Permanent vs. retryable errors distinguished in connectors (e.g., `isPermanentError()` in `powersync-connector.ts`)

**Error Recovery:**
- Network errors: Retryable, logged as warnings
- Constraint violations (23xxx): Permanent, logged as errors
- Permission violations (42501): Permanent, logged as errors
- RLS/PostgREST errors (PGRST): Permanent, logged as errors
- Examples in `powersync-connector.ts`:
  ```typescript
  if (isPermanentError(error)) {
    console.error('[PowerSync] Permanent upload error, discarding transaction:', error);
    await transaction.complete();
  } else {
    console.warn('[PowerSync] Retryable upload error:', error);
    throw error;
  }
  ```

## Logging

**Framework:** `console` (built-in browser/Node console)

**Patterns:**
- Contextual prefixes in brackets (e.g., `[PowerSync]`, `[auth]`)
- Severity levels: `console.log()` for info, `console.warn()` for warnings, `console.error()` for errors
- Include context in messages (e.g., which operation, what data)
- Example patterns from codebase:
  ```typescript
  console.log(`[PowerSync] Upserting to ${table}:`, data);
  console.warn('Map error:', event.error);
  console.error('Failed to fetch onboarding status:', error);
  console.log('[PowerSync] Status changed:', { connected, lastSyncedAt, dataFlowStatus });
  ```

**When to Log:**
- Component lifecycle events (auth state changes, sync status)
- API calls and responses (especially errors)
- Database operations (upsert, update, delete)
- State transitions in complex components
- Do NOT log sensitive data (tokens, passwords, phone numbers)

## Comments

**When to Comment:**
- Document complex algorithms or non-obvious logic
- Explain WHY decisions were made, not WHAT the code does (code should be self-documenting)
- Clarify business logic or constraints
- Mark known issues or workarounds with inline comments

**JSDoc/TSDoc:**
- Used for exported functions and utilities
- Example from `resolveNextRoute.ts`:
  ```typescript
  /**
   * Determines the next route based on onboarding status.
   *
   * This function centralizes the routing logic for the authentication
   * and onboarding flow. It returns the appropriate route based on
   * how far the user has progressed through onboarding.
   *
   * Route priority (in order):
   * 1. No status / not authenticated -> /auth/phone
   * 2. No profile created yet -> /onboarding/profile
   * ...
   *
   * @param status - The user's current onboarding status, or null if not authenticated
   * @returns The route path the user should be redirected to
   */
  export function resolveNextRoute(status: OnboardingStatus | null): string {
  ```
- Include `@param` and `@returns` for public APIs
- One-liner comments for small utilities acceptable

**TODO/FIXME Comments:**
- Use `TODO:` for planned improvements
- Use `FIXME:` for known bugs or workarounds
- Include author intent and context (rarely used in current codebase)

## Function Design

**Size:**
- Keep functions focused on single responsibility
- Utility functions: Typically 5-30 lines
- Components: Variable based on complexity, but aim for <150 lines before splitting
- Event handlers in components: Keep minimal, extract logic to utility functions or custom hooks

**Parameters:**
- Use destructured object parameters for components (e.g., `function Header({ farmName, onMenuOpen }: HeaderProps)`)
- Single parameter for simple utilities
- Limit to 3-4 parameters; use object if more needed
- Type all parameters explicitly

**Return Values:**
- Use explicit return types for all functions (TypeScript strict mode enforces this)
- Async functions return `Promise<T>`
- Void functions for side effects only (e.g., `const handleClick = useCallback(() => void)`)
- Example return types: `Promise<void>`, `string`, `boolean`, `WellWithReading[]`

## Module Design

**Exports:**
- Named exports for utilities and hooks (e.g., `export function useWells()`)
- Default exports for React components (e.g., `export default function MapView()`)
- Type exports: `export type` for TypeScript types (e.g., `export type WellWithReading`)
- Constants exported at module level (e.g., `export const AppSchema`)

**Barrel Files:**
- Used in `src/pages/onboarding/index.ts` to re-export onboarding pages
- Enables cleaner imports: `import { ProfilePage } from './pages/onboarding'`
- Pattern: `export { default as ComponentName } from './path'`

**Module Structure:**
- Organize by feature/domain (e.g., `hooks/useWells.ts`, `lib/AuthProvider.tsx`)
- Keep related functionality together
- Use private functions within modules (prefix with `_` or just don't export)

## PowerSync-Specific Conventions

**Query Guards:**
- Guard empty queries with `'SELECT NULL WHERE 0'` instead of empty string
- Prevents unnecessary database queries when farm_id is null
- Example from `useWells.ts`:
  ```typescript
  const query = farmId
    ? `SELECT ... FROM wells WHERE farm_id = ?`
    : 'SELECT NULL WHERE 0';
  ```

**Data Type Normalization:**
- PowerSync doesn't support BOOLEAN → use INTEGER (0/1)
- Convert in connector before sending to Supabase
- Convert in hooks when mapping query results (e.g., `row.send_monthly_report === 1`)
- Example from `useWells.ts`: `sendMonthlyReport: row.send_monthly_report === 1`

**Memoization:**
- Always memoize mapped query results with `useMemo`
- Prevents unnecessary re-renders of child components
- Example from `useWells.ts`:
  ```typescript
  const wells = useMemo<WellWithReading[]>(
    () => (data ?? []).map((row) => ({ ... })),
    [data],
  );
  ```

**Callback Optimization:**
- Wrap map click handlers and similar in `useCallback`
- Include proper dependency arrays
- Example: `const handleWellClick = useCallback((id: string) => navigate(...), [navigate])`

## React Patterns

**Functional Components Only:**
- Use only functional components with hooks
- No class components in current codebase

**Hooks Usage:**
- `useState` for component-level state
- `useCallback` for event handlers passed as props
- `useMemo` for expensive computations or derived data
- `useEffect` for side effects, always include cleanup for subscriptions
- `useRef` for DOM references or persistent values between renders
- `useContext` + custom hook for context consumption (e.g., `useAuth()`)

**Dependency Arrays:**
- Always include explicit dependency arrays on `useEffect`, `useMemo`, `useCallback`
- ESLint enforces this with `react-hooks/exhaustive-deps` rule
- Empty array `[]` only for mount/unmount effects

---

*Convention analysis: 2026-02-10*
