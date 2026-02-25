# Phase 37: Add multi-language support (English/Español) with persistent language preference - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add English/Spanish bilingual support across the entire app with a persistent language toggle. Users can switch between English and Español, and their choice persists across sessions via localStorage. The app defaults to English. All app-chrome text translates; user-entered data does not. The infrastructure should support easy addition of future languages.

</domain>

<decisions>
## Implementation Decisions

### Language Switching UX
- Instant switch — tap a language option and the entire app re-renders immediately (no save/confirm button)
- Language page (`/language`) is the sole access point — no additional toggle in Settings or side menu
- Default to English for first-time users (no device language detection)
- Language page title translates (`LANGUAGE` → `IDIOMA`), but language names always stay native: `English` and `Español`
- All navigation labels translate when language switches (Map → Mapa, Well List → Lista de Pozos, Settings → Configuración, etc.)
- All confirmation dialogs translate fully — titles, descriptions, and action buttons (Cancel → Cancelar, Delete → Eliminar)
- All toast notifications translate (success, error, info messages)
- All form validation error messages translate

### Translation Coverage
- **Full translation**: Every piece of app chrome — labels, buttons, page titles, messages, toasts, dialogs, validation errors
- **Equipment states**: Translate display labels only; database stores English values ('Ok', 'Dead', 'Low', etc.), UI renders translated labels ('Bueno', 'Muerta', 'Bajo')
- **Role names**: Translate display labels (Admin → Administrador, Meter Checker → Lector de Medidores, Grower → Agricultor)
- **Measurement units**: Translate labels (Gallons → Galones, Cubic Feet → Pies Cúbicos, Acre-Feet → Acres-Pie)
- **User-entered data**: Never translated — well names, user names, notes stay as-is
- **Relative times**: Translate ('1 day ago' → 'hace 1 día', 'Today' → 'Hoy', '2 weeks ago' → 'hace 2 semanas')

### Date/Number Formatting
- Dates: Locale-aware formatting (English: 'Feb 26, 2026', Spanish: '26 feb 2026') using browser Intl APIs
- Numbers: Keep US format always (1,234.56 with period decimal, comma thousands) — no locale switching for numbers to avoid confusion with meter readings
- Phone numbers: Keep +1 US format always — app serves US agricultural users

### Persistence & Sync
- Store language preference in localStorage via Zustand persist store (same pattern as `activeFarmStore`)
- Device-specific preference — no Supabase sync needed
- Losing preference on browser data clear is acceptable (easy to re-set)
- Language preference applies on app load before authentication — login and verify pages also translate
- Design translation key system for easy addition of future languages (adding a language = adding a new JSON/translation file)

### Claude's Discretion
- Choice of i18n library or custom translation hook implementation
- Translation file structure and organization
- How to handle edge cases with string interpolation and pluralization
- Exact Spanish translations for agricultural terminology

</decisions>

<specifics>
## Specific Ideas

- Existing `LanguagePage.tsx` stub has the route `/language` and side menu entry already wired — build on this
- Existing `activeFarmStore.ts` demonstrates the Zustand persist pattern to follow for language store
- `ROLE_DISPLAY_NAMES` in `permissions.ts` already centralizes role strings — extend this pattern for translations
- `toLocaleDateString('en-US', ...)` calls in 4+ components need to become locale-aware
- ~32 files contain user-facing strings that need translation keys

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-add-multi-language-support-english-espa-ol-with-persistent-language-preference*
*Context gathered: 2026-02-26*
