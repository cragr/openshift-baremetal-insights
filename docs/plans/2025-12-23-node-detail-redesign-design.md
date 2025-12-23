# Node Detail Page Redesign

## Overview

Redesign the NodeDetail page to replace tabs with inline sections, add networking and storage details, and improve the overview section with Redfish IP links.

## Backend Changes

### New Data Models

Add to `internal/models/types.go`:

```go
// NetworkAdapter represents a network interface card
type NetworkAdapter struct {
    Name       string `json:"name"`
    Model      string `json:"model"`
    Port       string `json:"port"`
    LinkStatus string `json:"linkStatus"`
    LinkSpeed  string `json:"linkSpeed"`
    MACAddress string `json:"macAddress"`
}

// StorageController represents a RAID/storage controller
type StorageController struct {
    Name              string `json:"name"`
    DeviceDescription string `json:"deviceDescription"`
    PCIeSlot          string `json:"pcieSlot"`
    FirmwareVersion   string `json:"firmwareVersion"`
}

// Disk represents a physical drive
type Disk struct {
    Name        string `json:"name"`
    State       string `json:"state"`
    SlotNumber  string `json:"slotNumber"`
    Size        string `json:"size"`
    BusProtocol string `json:"busProtocol"`
    MediaType   string `json:"mediaType"`
}

// StorageDetail holds controller and disk information
type StorageDetail struct {
    Controllers []StorageController `json:"controllers"`
    Disks       []Disk              `json:"disks"`
}
```

Add fields to Node struct:
```go
NetworkAdapters []NetworkAdapter `json:"networkAdapters,omitempty"`
Storage         *StorageDetail   `json:"storage,omitempty"`
```

### Redfish Client Functions

#### GetNetworkAdapters

Fetches network interface details from:
- `/redfish/v1/Systems/{id}/EthernetInterfaces` - interface info
- `/redfish/v1/Chassis/{id}/NetworkAdapters` - NIC hardware details

Data mapping:
| Redfish Field | Our Field |
|--------------|-----------|
| EthernetInterface.Name | Port |
| EthernetInterface.MACAddress | MACAddress |
| EthernetInterface.LinkStatus | LinkStatus (Up/Down/Unknown) |
| EthernetInterface.SpeedMbps | LinkSpeed (formatted as "X Gbps") |
| NetworkAdapter.Model | Model |

#### GetStorageDetails

Fetches storage details from:
- `/redfish/v1/Systems/{id}/Storage` - controllers
- `/redfish/v1/Systems/{id}/Storage/{id}/Drives` - physical drives

Data mapping:
| Redfish Field | Our Field |
|--------------|-----------|
| Storage.Name | Controller Name |
| StorageController.Model | DeviceDescription |
| StorageController.FirmwareVersion | FirmwareVersion |
| Location.ServiceLabel | PCIeSlot |
| Drive.Name | Disk Name |
| Drive.Status.State | State (Online/Offline/Failed) |
| Drive.CapacityBytes | Size (formatted) |
| Drive.Protocol | BusProtocol |
| Drive.MediaType | MediaType |

## Frontend Changes

### TypeScript Types

Add to `console-plugin/src/types.ts`:

```typescript
export interface NetworkAdapter {
  name: string;
  model: string;
  port: string;
  linkStatus: 'Up' | 'Down' | 'Unknown';
  linkSpeed: string;
  macAddress: string;
}

export interface StorageController {
  name: string;
  deviceDescription: string;
  pcieSlot: string;
  firmwareVersion: string;
}

export interface Disk {
  name: string;
  state: string;
  slotNumber: string;
  size: string;
  busProtocol: string;
  mediaType: string;
}

export interface StorageDetail {
  controllers: StorageController[];
  disks: Disk[];
}
```

### NodeDetail Page Layout

Replace tabs with scrollable sections:

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Overview > Nodes > {node.name}                  │
│ Title: {node.name}                                          │
├─────────────────────────────────────────────────────────────┤
│ OVERVIEW                                                    │
│ - Manufacturer, Model, Service Tag                          │
│ - System Health (renamed from "Health")                     │
│ - Power State                                               │
│ - Redfish IP (clickable link to https://<ip>)              │
│ - Last Scanned                                              │
├─────────────────────────────────────────────────────────────┤
│ HEALTH STATUS                                               │
│ - Processors, Memory, Network (from HealthRollup)           │
│ - Thermal Status, Power Status (from summaries)             │
│ - Fans (X/Y healthy)                                        │
├─────────────────────────────────────────────────────────────┤
│ NETWORKING                                                  │
│ Table: Model | Port | Link Status | Link Speed | MAC Address│
├─────────────────────────────────────────────────────────────┤
│ STORAGE                                                     │
│ Controllers table: Name | Description | PCIe Slot | Firmware│
│ Disks table: Name | State | Slot | Size | Bus | Media Type  │
├─────────────────────────────────────────────────────────────┤
│ POWER                                                       │
│ - Status, Current Power (W), Redundancy                     │
│ - Power Supplies: X/Y healthy                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Overview section**: Rename top card, change "Health" to "System Health", add clickable Redfish IP
2. **Health Status section**: New card consolidating health from HealthRollup plus thermal/power/fans
3. **Networking section**: New card with network adapter table
4. **Storage section**: New card with controllers and disks tables
5. **Power section**: Convert from tab to inline section
6. **Events tab**: Removed (available on dedicated Events page)

## Files to Modify

| File | Changes |
|------|---------|
| `internal/models/types.go` | Add NetworkAdapter, StorageController, Disk, StorageDetail types; update Node |
| `internal/redfish/client.go` | Add GetNetworkAdapters, GetStorageDetails functions |
| `internal/poller/poller.go` | Call new Redfish functions during polling |
| `console-plugin/src/types.ts` | Add TypeScript types |
| `console-plugin/src/pages/NodeDetail.tsx` | Redesign with sections |
| `console-plugin/src/pages/tabs/PowerTab.tsx` | Remove (inline in NodeDetail) |
| `console-plugin/src/pages/tabs/HealthTab.tsx` | Remove (inline in NodeDetail) |
| `console-plugin/src/pages/tabs/ThermalTab.tsx` | Remove (inline in NodeDetail) |

## Testing

- Unit tests for new Redfish client functions
- Unit tests for NodeDetail component
- Manual cluster testing to verify data displays correctly
