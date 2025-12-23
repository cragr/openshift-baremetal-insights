# Dashboard Enhancements Design

## Overview

Enhance the BareMetal Insights plugin with a comprehensive dashboard, reorganized navigation, dedicated firmware page, and namespace filtering across all views.

## Goals

- Provide at-a-glance visibility into fleet health, power state, and firmware status
- Add Redfish Task Service job monitoring
- Enable namespace-based filtering for multi-cluster/multi-namespace deployments
- Improve navigation with dedicated Firmware page
- Streamline Nodes table with relevant columns

## Navigation Structure

```
BareMetal Insights
├── Dashboard        /baremetal-insights
├── Nodes            /baremetal-insights/nodes
├── Firmware         /baremetal-insights/firmware (NEW)
└── Health Events    /baremetal-insights/events
```

**Node Detail** (`/baremetal-insights/nodes/:name`):
- Tabs: Health, Thermal, Power, Events
- Removed: Firmware tab (moved to top-level page)

## Dashboard Page

### Header
- Title: "Dashboard"
- Namespace dropdown (filters all data, persists across navigation)
- Countdown timer: "Refreshing in X:XX"

### Summary Strip (thin bar)

| Total Nodes | Healthy | Warning | Critical | Powered On | Powered Off | Updates Available |
|-------------|---------|---------|----------|------------|-------------|-------------------|
| 24          | 18      | 4       | 2        | 22         | 2           | 12 (3 critical)   |

### Expandable Card Sections

#### 1. Health Overview (expanded by default)
- Donut chart: healthy/warning/critical breakdown
- List of nodes in warning or critical state with quick links

#### 2. Power Status
- Powered On / Powered Off counts with visual indicator
- List of powered-off nodes

#### 3. Redfish Jobs
- Pending / In Progress / Completed counts
- Table: node name, job type, status, progress %

#### 4. Firmware Updates
- "X updates across Y nodes" with severity breakdown (Critical/Recommended/Optional)
- Link to Firmware page

## Nodes Page

### Header
- Title: "Nodes"
- Namespace dropdown (persists)

### Table Toolbar
- Filter chips: Health Status, Power State
- Search box for node name

### Table Columns

| Column | Description |
|--------|-------------|
| Name | Hyperlinks to OpenShift Console BareMetalHost resource page |
| Service Tag | Server service tag from BMC |
| Model | Server model (e.g., PowerEdge R640) |
| Health | OK / Warning / Critical with icon |
| Power State | On / Off |
| Last Scanned | Time since last Redfish poll |

**Removed columns:** Temp, Power (watts)

**Row click behavior:** Navigates to Node Detail page within BareMetal Insights

**Name link behavior:** Opens Console's BareMetalHost page (`/k8s/ns/{namespace}/metal3.io~v1alpha1~BareMetalHost/{name}`)

## Firmware Page

### Header
- Title: "Firmware"
- Namespace dropdown (persists)

### Updates Summary Card
- Large number: "X updates available across Y nodes"
- Severity breakdown: "N Critical · N Recommended · N Optional"
- Future: "Schedule Updates" action button (display only for now)

### Firmware Inventory Table

#### Toolbar
- Filter chips: Node, Component Type, Update Available (Yes/No), Severity
- Search box

#### Columns

| Column | Description |
|--------|-------------|
| Node | Node name |
| Component | BIOS, iDRAC, NIC, RAID, etc. |
| Installed Version | Currently installed firmware version |
| Available Version | Catalog version if update available, "—" if current |
| Severity | Critical / Recommended / Optional (for updates) |

Rows with available updates visually highlighted.

## Backend API Changes

### GET /api/v1/nodes (modify)

Add fields:
- `powerState`: "On" | "Off" | "Unknown"
- `serviceTag`: string
- `namespace`: string (BMH namespace or ManagedCluster name)

Add query parameter:
- `?namespace=` - filter by namespace

### GET /api/v1/dashboard (new)

Returns aggregated statistics:
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
    "critical": 3,
    "recommended": 5,
    "optional": 4,
    "nodesWithUpdates": 5
  },
  "jobsSummary": {
    "pending": 2,
    "inProgress": 1,
    "completed": 15
  },
  "lastRefresh": "2025-12-22T20:30:00Z",
  "nextRefresh": "2025-12-22T21:00:00Z"
}
```

Query parameter: `?namespace=`

### GET /api/v1/tasks (new)

Returns Redfish Task Service jobs:
```json
{
  "tasks": [
    {
      "node": "node-1",
      "namespace": "openshift-machine-api",
      "taskId": "JID_123456789",
      "taskType": "FirmwareUpdate",
      "taskState": "Running",
      "percentComplete": 45,
      "startTime": "2025-12-22T20:00:00Z",
      "message": "Downloading firmware package"
    }
  ]
}
```

Query parameter: `?namespace=`

### GET /api/v1/firmware (modify)

Add fields:
- `severity`: "Critical" | "Recommended" | "Optional" | null

Add query parameter:
- `?namespace=`

Add response summary:
```json
{
  "summary": {
    "total": 120,
    "updatesAvailable": 12,
    "critical": 3,
    "recommended": 5,
    "optional": 4
  },
  "firmware": [...]
}
```

## Polling Changes

### Task Service Polling
- Poll Redfish Task Service endpoint alongside existing health polling
- Endpoint: `GET /redfish/v1/TaskService/Tasks`
- Store task data in existing data store
- Include task polling in configured poll interval

### Namespace Support
- Discoverer already tracks BMH namespace
- For ACM: track ManagedCluster name from discovery
- Pass namespace through to all stored data

## UI Components

### Shared Components
- **NamespaceDropdown**: Persistent namespace filter in page headers
- **RefreshCountdown**: Shows time until next poll with optional manual refresh

### PatternFly Components Used
- Card, CardExpandableContent (dashboard sections)
- Toolbar, ToolbarFilter (table filtering)
- Table with sorting and filtering
- Select (namespace dropdown)
- Label (severity badges)
- Icon (health status indicators)

## File Changes Summary

### Frontend (console-plugin/)
- Rename `Overview.tsx` → `Dashboard.tsx`
- Create `Firmware.tsx` (new page)
- Modify `Nodes.tsx` (new columns, remove old)
- Modify `NodeDetail.tsx` (remove Firmware tab)
- Update `console-extensions.json` (nav changes)
- Create shared components: `NamespaceDropdown.tsx`, `RefreshCountdown.tsx`
- Update `api.ts` (new endpoints)
- Update types

### Backend (internal/)
- `api/server.go`: Add dashboard and tasks endpoints
- `api/handlers.go`: New handler functions
- `store/store.go`: Add task storage
- `poller/poller.go`: Add task polling
- `redfish/client.go`: Add GetTasks method
- `models/models.go`: Add Task, DashboardStats types

## Testing Considerations

- Unit tests for new API endpoints
- Frontend component tests for Dashboard, Firmware pages
- Integration test for namespace filtering
- Test task polling with mock Redfish responses
