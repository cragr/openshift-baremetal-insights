# Firmware Page Redesign

## Overview

Redesign the Firmware page to provide both server-centric and component-centric views, with the ability to schedule firmware updates with OnReboot option.

## Page Structure

### Header Section
- Title "Firmware" with namespace dropdown on the right
- Updates Summary card below (Total, Updates Available, Critical/Recommended/Optional counts)

### Tabs
- **Servers** tab (default) - Server-centric view
- **Components** tab - Component-level view

### Toolbar (shared across tabs)
- Search input: "Search by node name or model..."
- "Updates Only" toggle - Filter to show only items with available updates
- "Schedule Update" button (disabled until selection made, shows count when items selected)

## Servers Tab

### Table Columns
| Checkbox | Node Name | Namespace | Model | Manufacturer | Updates | Severity | Last Scanned |

### Behavior
- Checkbox column with "select all" header checkbox
- Node Name is clickable - opens slide-out drawer with firmware details
- Updates column shows count (e.g., "3 updates")
- Severity shows highest severity among available updates (Critical > Recommended > Optional), or "-" if none
- Rows with updates highlighted with warning background color
- Sortable columns

### Row Selection Rules
- Only rows with updates available can be selected (checkbox disabled otherwise)
- Selecting a server selects ALL available updates for that server

## Components Tab

### Table Columns
| Checkbox | Node Name | Model | Component | Installed Version | Available Version | Severity |

### Behavior
- Checkbox column for component-level selection
- Model column added (searchable)
- Component column shows name + component type (as subtext)
- Only rows with available updates can be selected
- Sortable columns
- Same row highlighting for items with updates

### Search Applies To
- Node name
- Model
- Component name
- Component type

## Firmware Detail Drawer

### Drawer Header
- Node name as title
- Model / Manufacturer as subtitle
- Close button (X)

### Drawer Content
Table showing all firmware for that node:

| Component | Type | Installed | Available | Severity |

### Behavior
- Components with updates highlighted
- Available column shows version or "-" if up-to-date
- Severity column shows label (Critical/Recommended/Optional) or "-"

## Schedule Update Flow

### Trigger
- "Schedule Update" button in toolbar (disabled when nothing selected)
- Button shows selection count: "Schedule Update (3)"

### Confirmation Modal
- Title: "Schedule Firmware Updates"
- Summary: "X updates on Y servers will be scheduled"
- List of affected servers with update counts
- Update mode: "OnReboot" (pre-selected, only option for now)
- Note: "Updates will be applied during the next server reboot"
- Cancel / Confirm buttons

### After Confirmation
- API call to schedule updates
- Success toast notification
- Selection cleared
- Table refreshes to show pending status

## API Requirements

### Existing APIs
- `GET /api/v1/firmware` - Returns firmware components (used for Components tab)
- `GET /api/v1/nodes` - Returns node data including model, manufacturer (used for Servers tab)

### New API Needed
- `POST /api/v1/updates/schedule` - Schedule firmware updates
  - Request body: `{ nodes: string[], components?: string[], mode: "OnReboot" }`
  - Response: `{ taskIds: string[], message: string }`
