# Dashboard Redesign

## Overview

Simplify the Dashboard page by removing the refresh controls and expandable sections, replacing them with a clean 2x2 grid of larger, interactive cards with donut charts for health and power status visualization.

## Goals

- Remove visual clutter (refresh countdown, expandable sections)
- Provide clear at-a-glance metrics in larger cards
- Enable quick navigation via clickable cards with pre-applied filters
- Fix PowerState data to pull correctly from Redfish

## Layout

### Page Header
- Title: "Dashboard"
- Namespace dropdown (retained for filtering)
- **Removed:** Refresh countdown timer and manual refresh button

### Card Grid (2x2)

```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│     TOTAL NODES         │    HEALTH STATUS        │
│         24              │    [Donut Chart]        │
│                         │   18 / 4 / 2            │
│     (click → Nodes)     │  (click → Nodes+filter) │
│                         │                         │
├─────────────────────────┼─────────────────────────┤
│                         │                         │
│     POWER STATUS        │   UPDATES AVAILABLE     │
│    [Donut Chart]        │         12              │
│     22 On / 2 Off       │    (3 critical)         │
│  (click → Nodes+filter) │   (click → Firmware)    │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

### Removed Elements
- Health Overview expandable section
- Power Status expandable section
- Redfish Jobs expandable section
- Firmware Updates expandable section
- RefreshCountdown component
- Manual refresh button

## Card Details

### Total Nodes Card
- Large centered number (e.g., "24")
- Label below: "Total Nodes"
- Entire card clickable → navigates to `/baremetal-insights/nodes`
- Hover state: subtle highlight/border

### Health Status Card (Donut Chart)
- Donut segments: Healthy (green), Warning (yellow), Critical (red)
- Center displays total count or "Health" label
- Legend below donut showing counts: "18 Healthy · 4 Warning · 2 Critical"
- Click behaviors:
  - Healthy segment → `/baremetal-insights/nodes?health=healthy`
  - Warning segment → `/baremetal-insights/nodes?health=warning`
  - Critical segment → `/baremetal-insights/nodes?health=critical`
  - Card background (non-segment) → `/baremetal-insights/nodes`

### Power Status Card (Donut Chart)
- Donut segments: On (blue/green), Off (gray)
- Center displays total or "Power" label
- Legend: "22 On · 2 Off"
- Click behaviors:
  - On segment → `/baremetal-insights/nodes?power=on`
  - Off segment → `/baremetal-insights/nodes?power=off`
  - Card background → `/baremetal-insights/nodes`

### Updates Available Card
- Large centered number (e.g., "12")
- Subtitle: "3 critical" (if any critical updates)
- Label: "Updates Available"
- Entire card clickable → navigates to `/baremetal-insights/firmware`

## Backend Changes (PowerState Fix)

### Current Issue
The "Powered On" card shows 0 because PowerState isn't being fetched correctly from Redfish.

### Required Fix
Query Redfish endpoint: `GET /redfish/v1/Systems/System.Embedded.1`

Extract `PowerState` field which returns one of:
- `"On"`
- `"Off"`
- `"PoweringOn"`
- `"PoweringOff"`
- `"Resetting"`

### Data Mapping for Dashboard
For the Power donut chart, group states:
- **On**: `"On"`, `"PoweringOn"`, `"Resetting"`
- **Off**: `"Off"`, `"PoweringOff"`

### API Response
`GET /api/v1/dashboard` returns:
```json
{
  "totalNodes": 24,
  "healthSummary": {
    "healthy": 18,
    "warning": 4,
    "critical": 2
  },
  "powerSummary": {
    "on": 22,
    "off": 2
  },
  "updatesSummary": {
    "total": 12,
    "critical": 3
  }
}
```

## Implementation

### Frontend Changes (`console-plugin/src/`)

**Dashboard.tsx** - Major rewrite:
- Remove `RefreshCountdown` component usage
- Remove expandable card sections
- Add 2x2 card grid layout
- Add PatternFly `ChartDonut` components for Health and Power
- Add click handlers with navigation + query params
- Increase card sizes via CSS

### Backend Changes (`internal/`)

**redfish/client.go**:
- Verify `GetSystemInfo()` fetches from `/redfish/v1/Systems/System.Embedded.1`
- Ensure `PowerState` field is captured

**store/store.go**:
- Verify PowerState is stored per node

**api/handlers.go**:
- Verify dashboard handler aggregates PowerState correctly

### Dependencies
- PatternFly Charts (`@patternfly/react-charts`) - verify installed

## Testing

- Verify donut charts render with correct data
- Test click navigation with query parameters
- Verify Nodes page respects `?health=` and `?power=` query params
- Test PowerState values from Redfish mock responses
- Verify responsive behavior of 2x2 grid
