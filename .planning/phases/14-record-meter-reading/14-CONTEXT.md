# Phase 14: Record Meter Reading - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Field agents can record a new meter reading with GPS location capture, get warned about suspicious values, and report meter problems — all working offline. The reading form opens from the well detail page as a bottom sheet. Editing/deleting readings belongs in Phase 16.

</domain>

<decisions>
## Implementation Decisions

### Reading form container
- Bottom sheet that slides up over the well detail page
- Two tabs: "Reading" (default active) and "Meter Problem" — single sheet, user switches between
- Header shows "NEW READING" + well name

### Reading input design
- Big, prominent numeric input field — optimized for field entry (sun, gloves)
- Unit and multiplier displayed inline beside (right of) the input text (e.g., "GAL x 10.0")
- No reference to previous reading value shown — agent reads the meter fresh
- Validation: positive numbers only — reject zero, negative, and non-numeric with inline error
- Numeric keypad on mobile

### Similar reading warning
- Triggered when value is within 5 units of the last recorded reading
- Displayed INSIDE the bottom sheet, replacing the form content (not a separate modal)
- Yellow warning icon + "Similar Reading" header
- Bullet points: "This reading is within 5 gallons of the last recorded reading" / "Double check the meter"
- "Continue" button to proceed and save anyway

### GPS & proximity feedback
- Real-time proximity indicator in the bottom sheet header area (top-right) showing "In Range" / "Out of Range"
- GPS location captured automatically on submit — stored with the reading
- Out-of-range submission triggers a warning screen inside the sheet (same pattern as similar reading warning)
- Warning shows: "GPS Coordinates Incorrect" / "Are you at the right well?" / "Check your device GPS"
- User CAN continue and submit anyway — reading gets flagged as out-of-range but is NOT blocked
- Consistent with existing project decision: GPS proximity = display + flag, does NOT block recording

### Meter problem reporting
- "Meter Problem" tab with checkboxes: Not Working, Battery Dead, Pump Off, Dead Pump
- Multiple problems can be selected simultaneously (checkboxes, not radio buttons)
- Submitting updates the well's equipment status fields (pump_state, battery_state, meter_status)

### Post-submit behavior
- Both tabs (reading and meter problem): close bottom sheet + success toast
- Well detail page updates to reflect the new reading or status change

### Claude's Discretion
- Toast notification design and duration
- Exact bottom sheet height and animation
- Checkbox styling on Meter Problem tab
- Loading/submitting state indicator design
- How to handle GPS unavailable (no permission or no signal)

</decisions>

<specifics>
## Specific Ideas

- UI reference screenshots provided by user — bottom sheet with "NEW READING / WELL 1" header, Reading/Meter Problem tabs, input with "GAL x 10.0" suffix, Cancel + green "Submit Reading" button
- Similar reading warning replaces form content inside sheet (not a modal overlay)
- Out-of-range warning follows the same in-sheet pattern as similar reading warning
- The well detail page already shows "In Range of Well" / "Out of Range of Well" — the bottom sheet should have its own real-time indicator in the header

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-record-meter-reading*
*Context gathered: 2026-02-19*
