# Phase 15: Well Editing & Allocation Management - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can edit well properties (all fields) and manage allocation periods — create, view, edit, delete allocation periods with auto-calculated or manually overridden usage values. Navigation flow: Well Detail Sheet → Edit Form (full page) → Allocations Page. Includes well deletion with cascade. Reading edit/delete is Phase 16.

</domain>

<decisions>
## Implementation Decisions

### Well Edit Form
- All fields editable: name, serial number, WMIS, coordinates, units, multiplier, equipment status
- Layout matches existing create well form (same field order, segmented controls)
- Units: segmented control (AF, GAL, CF)
- Multiplier: segmented control (0.01, 1, 10, 1000, MG)
- Equipment status: dropdown per item with specific states (e.g., Pump: Running / Off / Dead)
- Coordinates: "Use my location" GPS button + manual lat/lng text fields
- "Send monthly meter reading report" checkbox
- "Allocations — N Periods" tappable row linking to allocation page (count = number of created allocations, always tappable)
- Allocation count auto-refreshes when returning from allocations page (PowerSync reactivity)
- Unique well name + WMIS validation within same farm
- Unsaved changes trigger "Discard changes?" confirmation on back navigation
- Includes "Delete Well" button — cascade deletes well + all readings + allocations
- Permissions: anyone with well access can edit and delete
- After save: navigate back to well detail sheet with success toast
- After delete: navigate back to map with success toast

### Navigation Flow
- Edit button on well detail sheet → full-page route (detail sheet closes)
- Edit form back → well detail sheet reopens
- "Allocations — N Periods" in edit form → separate full-page allocation page
- Allocation page "Back to Well" → returns to edit form
- Allocations only accessible through the edit form (not from well detail sheet directly)
- Usage gauge on well detail sheet is purely informational (not tappable)

### Allocation CRUD
- Allocation page layout: inline form at top + allocation table below (matches screenshots)
- Inline form hidden by default — appears on "+ Add Allocation" or tapping a table row
- Tap allocation row → loads that allocation into the inline form for editing
- Form fields: Start Date, End Date, Allocated (AF), Starting Reading (baseline meter value for usage calculation)
- Date picker: month + year scroll wheel only (day auto-set to 1st of month for start, last of month for end)
- No overlapping allocation periods allowed — validation blocks save
- Delete requires confirmation dialog
- "Close" button hides the inline form (collapses back to list-only view)
- "Save" button persists changes and keeps form visible
- "+ Add Allocation" button at bottom of page

### Usage Calculation & Override
- Auto-calculated: Used = (latest reading in period - Starting Reading) x multiplier, converted to AF
- Manual override allowed: user can type a Used value that overrides auto-calculation
- Once overridden, stays manual (no reset to auto-calculated)
- "M" indicator shown in allocation table row when Used value is manually overridden
- Well detail sheet's usage gauge shows real Used data from current allocation (auto or manual)

### Claude's Discretion
- Exact dropdown state options for equipment status (Pump, Battery, Meter)
- Form spacing and visual details
- Error handling and loading states
- Month/year picker implementation approach
- Toast message wording

</decisions>

<specifics>
## Specific Ideas

- Well edit form matches the existing create well form layout exactly (see screenshot: name, serial, WMIS, lat/lng with GPS pin, allocations link, units segmented control, multiplier segmented control, report checkbox, equipment status indicators)
- Allocation page has a well header at top (well name + "Updated Yesterday") with farm name subtitle and "EDIT WELL ALLOCATIONS" title
- "Select or Add an Allocation Below" instruction text shown when no allocation is selected
- Allocation table columns: Start, End, Used (AF), Allocated (AF) — with "M" prefix on manually overridden rows
- Date picker is a scrollable month/year wheel (not a calendar) with Reset and confirm buttons
- Starting Reading field serves as the baseline for usage calculation (latest reading - starting reading)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-well-editing-allocation-management*
*Context gathered: 2026-02-19*
