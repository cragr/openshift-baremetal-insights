# BareMetal Insights: Enhanced Health Visibility Design

## Overview

Extend the OpenShift BareMetal Insights console plugin to provide comprehensive hardware health visibility beyond firmware inventory. Enable operations teams to quickly identify and troubleshoot server issues directly from the OpenShift Console.

**Goal:** Provide instant fleet-wide health visibility with drill-down to individual node details.

**Scope:** Read-only visibility of health status, thermal data, power metrics, and hardware events from Dell servers via Redfish API.

---

## Navigation Structure

New "BareMetal Insights" section in the OpenShift Console admin perspective:

```
BareMetal Insights (Section)
├── Overview          ← Fleet health dashboard
├── Nodes             ← Node list with health status
├── Health Events     ← Fleet-wide event timeline
└── [Node Detail]     ← Click-through from Nodes list
    ├── Health tab
    ├── Thermal tab
    ├── Power tab
    ├── Firmware tab
    └── Events tab
```

This replaces the current standalone "Firmware Overview/Nodes/Updates" navigation with a unified section.

---

## Page Designs

### Overview Page (Fleet Dashboard)

**Purpose:** Instant fleet-wide health snapshot - "Are any servers in trouble?"

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Summary Cards (top row)                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Total    │ │ Healthy  │ │ Warning  │ │ Critical │ │ Firmware │      │
│  │ Nodes    │ │    ✓     │ │    ⚠     │ │    ✕     │ │ Updates  │      │
│  │   12     │ │    9     │ │    2     │ │    1     │ │  4 nodes │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────────────────┤
│  Recent Health Events              │  Nodes Needing Attention           │
│  ─────────────────────             │  ─────────────────────             │
│  ⚠ node-3: Fan 2 speed low (2m)   │  node-7  Critical                  │
│  ✕ node-7: PSU 1 failed (15m)     │  node-3  Warning                   │
│  ⚠ node-3: Temp warning (1h)      │  node-9  Warning                   │
│  ✓ node-5: Memory corrected (2h)  │                                     │
│                                    │                                     │
│  [View All Events →]               │  [View All Nodes →]                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Data:**
- Summary cards: Node counts by health status + firmware update count (all clickable)
- Recent events: Last 5-10 hardware events with severity, timestamp, node link
- Attention list: Nodes not in "Healthy" state, sorted by severity

---

### Nodes Page (List View)

**Purpose:** Browse all nodes with at-a-glance health status - "Which servers need attention?"

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Toolbar                                                                 │
│  [Search by name...] [Status ▼] [Model ▼]              [⟳ Refresh]     │
├─────────────────────────────────────────────────────────────────────────┤
│  Name       │ Model              │ Health │ Temp  │ Power │ Last Seen   │
│  ─────────────────────────────────────────────────────────────────────  │
│  node-1     │ PowerEdge R640     │   ✓    │ 42°C  │ 380W  │ 2m ago      │
│  node-2     │ PowerEdge R640     │   ✓    │ 38°C  │ 365W  │ 2m ago      │
│  node-3     │ PowerEdge R750     │   ⚠    │ 71°C  │ 420W  │ 2m ago      │
│  node-7     │ PowerEdge R640     │   ✕    │ 45°C  │ 190W  │ 2m ago      │
│  ...                                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Showing 1-10 of 12 nodes                              [< 1 2 >]        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Columns:**
- Name: Node identifier (links to Node Detail)
- Model: Server model (e.g., PowerEdge R640)
- Health: Aggregated status icon (Critical/Warning/OK)
- Temp: Highest current temperature reading
- Power: Current power consumption in watts
- Last Seen: Time since last successful poll

**Interactions:**
- Row click navigates to Node Detail page
- Column headers sortable
- Filters: Status (Critical/Warning/OK), Model dropdown
- Search: Filter by node name

---

### Health Events Page

**Purpose:** Fleet-wide event timeline - "What's been happening across all servers?"

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Toolbar                                                                 │
│  [Search events...] [Severity ▼] [Node ▼] [Time Range ▼]  [⟳ Refresh]  │
├─────────────────────────────────────────────────────────────────────────┤
│  Severity │ Node    │ Event                              │ Timestamp    │
│  ─────────────────────────────────────────────────────────────────────  │
│     ✕     │ node-7  │ Power Supply 1 failed              │ Today 14:32  │
│     ⚠     │ node-3  │ Fan 2 running below threshold      │ Today 14:15  │
│     ⚠     │ node-3  │ Inlet temperature warning 71°C     │ Today 13:45  │
│     ✓     │ node-5  │ Correctable memory error (DIMM A1) │ Today 12:20  │
│     ✓     │ node-2  │ System boot completed              │ Today 09:15  │
│     ⚠     │ node-9  │ Drive predictive failure SSD 3     │ Yesterday    │
│  ...                                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 142 events                            [< 1 2 3 ... >]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Columns:**
- Severity: Critical (✕), Warning (⚠), Informational (✓)
- Node: Node name (links to Node Detail)
- Event: Description from SEL/Redfish event
- Timestamp: When the event occurred

**Filters:**
- Severity: Critical, Warning, Info, or All
- Node: Filter to specific node
- Time Range: Last hour, 24h, 7 days, 30 days, custom

**Data source:** Redfish System Event Log (SEL) entries from each node's BMC

---

### Node Detail Page

**Purpose:** Deep dive into one node - "What exactly is wrong with this server?"

**Layout:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back to Nodes                                                         │
│                                                                          │
│  node-7                                            Health: ✕ Critical   │
│  PowerEdge R640 • Service Tag: ABC1234 • iDRAC: 192.168.1.107           │
├─────────────────────────────────────────────────────────────────────────┤
│  [Health] [Thermal] [Power] [Firmware] [Events]    ← Tab navigation     │
├─────────────────────────────────────────────────────────────────────────┤
```

**Header:** Node name, model, service tag, BMC IP, overall health badge

#### Health Tab (Default)

Component status summary showing overall health of each subsystem.

```
│  Component        │ Status │ Details                             │
│  ────────────────────────────────────────────────────────────── │
│  Processors       │   ✓    │ 2x Intel Xeon Gold 6248 - OK        │
│  Memory           │   ✓    │ 384 GB (12x 32GB) - OK              │
│  Power Supplies   │   ✕    │ PSU 1: Failed, PSU 2: OK            │
│  Fans             │   ✓    │ 6/6 fans operational                │
│  Storage          │   ✓    │ 8 drives - All healthy              │
│  Network          │   ✓    │ 4 NICs - All linked                 │
```

#### Thermal Tab

Temperature sensors and fan speeds.

```
│  Sensors                           │  Fans                        │
│  ─────────────────────────────────│  ──────────────────────────  │
│  Inlet Temp:      28°C (OK)       │  Fan 1:  8400 RPM (OK)       │
│  CPU 1 Temp:      62°C (OK)       │  Fan 2:  8350 RPM (OK)       │
│  CPU 2 Temp:      58°C (OK)       │  Fan 3:  8400 RPM (OK)       │
│  Exhaust Temp:    45°C (OK)       │  Fan 4:  8200 RPM (OK)       │
│  DIMM Zone:       38°C (OK)       │  Fan 5:  8450 RPM (OK)       │
│                                    │  Fan 6:  8300 RPM (OK)       │
```

#### Power Tab

Power supply status and consumption metrics.

```
│  Power Supplies                    │  Consumption                 │
│  ─────────────────────────────────│  ──────────────────────────  │
│  PSU 1:  ✕ Failed (750W)          │  Current:     380W           │
│  PSU 2:  ✓ OK (750W)              │  Peak:        520W           │
│                                    │  Average:     365W           │
│  Redundancy: Lost                  │  Cap Enabled: No             │
```

#### Firmware Tab

Existing firmware inventory view - component versions and available updates.

```
│  Component          │ Type    │ Current    │ Available  │ Status  │
│  ─────────────────────────────────────────────────────────────── │
│  BIOS               │ BIOS    │ 2.12.2     │ 2.14.1     │   ⚠     │
│  iDRAC              │ BMC     │ 6.10.00    │ 6.10.00    │   ✓     │
│  PERC H740P         │ Storage │ 51.14.0    │ 52.16.1    │   ⚠     │
│  Intel X710 NIC     │ Network │ 20.5.13    │ 20.5.13    │   ✓     │
```

#### Events Tab

Recent SEL entries for this node only.

```
│  Severity │ Event                              │ Timestamp         │
│  ─────────────────────────────────────────────────────────────── │
│     ✕     │ Power Supply 1 failed              │ Today 14:32       │
│     ✓     │ System boot completed              │ Today 09:15       │
│     ⚠     │ Correctable memory error DIMM A1   │ Yesterday 18:42   │
```

---

## Backend API

### New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/v1/nodes` | GET | Extended with health, thermal, power summary |
| `GET /api/v1/nodes/{name}/health` | GET | Component health details |
| `GET /api/v1/nodes/{name}/thermal` | GET | Temperature sensors and fan speeds |
| `GET /api/v1/nodes/{name}/power` | GET | PSU status and power consumption |
| `GET /api/v1/nodes/{name}/events` | GET | Node-specific SEL entries |
| `GET /api/v1/events` | GET | Fleet-wide events (paginated, filterable) |

### Extended Node Response

```json
{
  "name": "node-7",
  "model": "PowerEdge R640",
  "manufacturer": "Dell Inc.",
  "serviceTag": "ABC1234",
  "bmcIP": "192.168.1.107",
  "health": "Critical",
  "healthRollup": {
    "processors": "OK",
    "memory": "OK",
    "powerSupplies": "Critical",
    "fans": "OK",
    "storage": "OK",
    "network": "OK"
  },
  "thermalSummary": {
    "maxTemp": 62,
    "inletTemp": 28
  },
  "powerSummary": {
    "currentWatts": 380,
    "psuRedundancy": "Lost"
  },
  "firmwareUpdatesAvailable": 2,
  "lastSeen": "2025-12-22T14:30:00Z"
}
```

### Redfish Data Sources

| Data | Redfish Path |
|------|--------------|
| System health | `/redfish/v1/Systems/{id}` |
| Processors | `/redfish/v1/Systems/{id}/Processors` |
| Memory | `/redfish/v1/Systems/{id}/Memory` |
| Thermal | `/redfish/v1/Chassis/{id}/Thermal` |
| Power | `/redfish/v1/Chassis/{id}/Power` |
| Storage | `/redfish/v1/Systems/{id}/Storage` |
| Network | `/redfish/v1/Systems/{id}/NetworkInterfaces` |
| Event Log | `/redfish/v1/Managers/{id}/LogServices/Sel/Entries` |

---

## Console Plugin Changes

### Navigation Extensions

```json
[
  {
    "type": "console.navigation/section",
    "properties": {
      "id": "baremetal-insights",
      "perspective": "admin",
      "name": "BareMetal Insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-overview",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Overview",
      "href": "/baremetal-insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-nodes",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Nodes",
      "href": "/baremetal-insights/nodes"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-events",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Health Events",
      "href": "/baremetal-insights/events"
    }
  }
]
```

### Route Extensions

```json
[
  {
    "type": "console.page/route",
    "properties": {
      "path": "/baremetal-insights",
      "component": { "$codeRef": "Overview" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/baremetal-insights/nodes",
      "component": { "$codeRef": "Nodes" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/baremetal-insights/nodes/:name",
      "component": { "$codeRef": "NodeDetail" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/baremetal-insights/events",
      "component": { "$codeRef": "HealthEvents" }
    }
  }
]
```

---

## Migration from Current Plugin

The current plugin has three navigation items under Compute:
- Firmware Overview
- Firmware Nodes
- Firmware Updates

These will be removed and replaced by the new "BareMetal Insights" section. Firmware visibility moves to the Node Detail "Firmware" tab, with a summary count on the Overview dashboard.

---

## Out of Scope

- Firmware update execution (read-only visibility only)
- Support for non-Dell servers
- Real-time streaming updates (polling-based refresh)
- Alerting/notification integration
- Historical trend data

---

## Implementation Phases

1. **Backend API extensions** - Add health, thermal, power, events endpoints
2. **New page components** - Overview, Nodes list, Health Events, Node Detail with tabs
3. **Navigation restructure** - New BareMetal Insights section, remove old Firmware nav
4. **Testing and polish** - End-to-end testing, error handling, loading states
