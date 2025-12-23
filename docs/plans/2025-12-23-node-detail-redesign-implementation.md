# Node Detail Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the NodeDetail page with inline sections for Overview, Health Status, Networking, Storage, and Power, replacing the current tab-based layout.

**Architecture:** Add new Redfish client functions to fetch network adapter and storage details, extend the Node model with these fields, update the poller to collect this data, and redesign the frontend NodeDetail component with Card-based sections instead of tabs.

**Tech Stack:** Go (backend), gofish Redfish library, React/TypeScript (frontend), PatternFly components

---

### Task 1: Add Backend Data Models

**Files:**
- Modify: `internal/models/types.go`
- Test: `internal/models/types_test.go`

**Step 1: Add NetworkAdapter type**

Add after `PowerDetail` struct around line 176:

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
```

**Step 2: Add StorageController type**

Add after `NetworkAdapter`:

```go
// StorageController represents a RAID/storage controller
type StorageController struct {
	Name              string `json:"name"`
	DeviceDescription string `json:"deviceDescription"`
	PCIeSlot          string `json:"pcieSlot"`
	FirmwareVersion   string `json:"firmwareVersion"`
}
```

**Step 3: Add Disk type**

Add after `StorageController`:

```go
// Disk represents a physical drive
type Disk struct {
	Name        string `json:"name"`
	State       string `json:"state"`
	SlotNumber  string `json:"slotNumber"`
	Size        string `json:"size"`
	BusProtocol string `json:"busProtocol"`
	MediaType   string `json:"mediaType"`
}
```

**Step 4: Add StorageDetail type**

Add after `Disk`:

```go
// StorageDetail holds controller and disk information
type StorageDetail struct {
	Controllers []StorageController `json:"controllers"`
	Disks       []Disk              `json:"disks"`
}
```

**Step 5: Update Node struct**

Add new fields to the Node struct after `PowerSummary` (around line 51):

```go
	NetworkAdapters []NetworkAdapter `json:"networkAdapters,omitempty"`
	Storage         *StorageDetail   `json:"storage,omitempty"`
```

**Step 6: Run existing tests**

Run: `go test ./internal/models/...`
Expected: PASS (no behavior changes)

**Step 7: Commit**

```bash
git add internal/models/types.go
git commit -m "feat(models): add NetworkAdapter, StorageController, Disk types"
```

---

### Task 2: Add GetNetworkAdapters Redfish Function

**Files:**
- Modify: `internal/redfish/client.go`
- Test: `internal/redfish/client_test.go`

**Step 1: Add helper function for link speed formatting**

Add after the `contains` function around line 159:

```go
// formatLinkSpeed converts Mbps to human-readable format
func formatLinkSpeed(mbps int) string {
	if mbps >= 1000 {
		return fmt.Sprintf("%d Gbps", mbps/1000)
	}
	if mbps > 0 {
		return fmt.Sprintf("%d Mbps", mbps)
	}
	return "Unknown"
}

// normalizeLinkStatus converts Redfish LinkStatus to simplified status
func normalizeLinkStatus(status string) string {
	switch status {
	case "LinkUp":
		return "Up"
	case "LinkDown", "NoLink":
		return "Down"
	default:
		return "Unknown"
	}
}
```

**Step 2: Add GetNetworkAdapters function**

Add after `GetPowerData` function:

```go
// GetNetworkAdapters fetches network interface details from Redfish
func (c *Client) GetNetworkAdapters(ctx context.Context, bmcAddress, username, password string) ([]models.NetworkAdapter, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, fmt.Errorf("failed to get systems: %w", err)
	}

	if len(systems) == 0 {
		return nil, fmt.Errorf("no systems found")
	}

	adapters := make([]models.NetworkAdapter, 0)

	// Get EthernetInterfaces from Systems endpoint
	ethInterfaces, err := systems[0].EthernetInterfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get ethernet interfaces: %w", err)
	}

	for _, eth := range ethInterfaces {
		adapter := models.NetworkAdapter{
			Name:       eth.Name,
			Port:       eth.ID,
			MACAddress: eth.MACAddress,
			LinkStatus: normalizeLinkStatus(string(eth.LinkStatus)),
			LinkSpeed:  formatLinkSpeed(eth.SpeedMbps),
			Model:      eth.Name, // Default to name, will be enriched if NetworkAdapters available
		}
		adapters = append(adapters, adapter)
	}

	// Try to get detailed model info from Chassis NetworkAdapters
	chassis, err := service.Chassis()
	if err == nil && len(chassis) > 0 {
		for _, ch := range chassis {
			netAdapters, err := ch.NetworkAdapters()
			if err != nil || len(netAdapters) == 0 {
				continue
			}
			// Build model lookup from network adapters
			for _, na := range netAdapters {
				// Update adapters that match this network adapter's ports
				for i := range adapters {
					if contains(adapters[i].Port, na.ID) || contains(adapters[i].Name, na.ID) {
						adapters[i].Model = na.Model
					}
				}
			}
		}
	}

	return adapters, nil
}
```

**Step 3: Run tests**

Run: `go test ./internal/redfish/... -v`
Expected: PASS

**Step 4: Commit**

```bash
git add internal/redfish/client.go
git commit -m "feat(redfish): add GetNetworkAdapters function"
```

---

### Task 3: Add GetStorageDetails Redfish Function

**Files:**
- Modify: `internal/redfish/client.go`

**Step 1: Add helper function for capacity formatting**

Add after `normalizeLinkStatus`:

```go
// formatCapacity converts bytes to human-readable format
func formatCapacity(bytes int64) string {
	const (
		TB = 1000 * 1000 * 1000 * 1000
		GB = 1000 * 1000 * 1000
	)
	if bytes >= TB {
		return fmt.Sprintf("%.1f TB", float64(bytes)/float64(TB))
	}
	if bytes >= GB {
		return fmt.Sprintf("%d GB", bytes/GB)
	}
	return fmt.Sprintf("%d bytes", bytes)
}

// normalizeDriveState converts Redfish State to simplified status
func normalizeDriveState(state string) string {
	switch state {
	case "Enabled":
		return "Online"
	case "Disabled", "StandbyOffline":
		return "Offline"
	case "Absent":
		return "Absent"
	default:
		return state
	}
}
```

**Step 2: Add GetStorageDetails function**

Add after `GetNetworkAdapters`:

```go
// GetStorageDetails fetches controller and disk information from Redfish
func (c *Client) GetStorageDetails(ctx context.Context, bmcAddress, username, password string) (*models.StorageDetail, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, fmt.Errorf("failed to get systems: %w", err)
	}

	if len(systems) == 0 {
		return nil, fmt.Errorf("no systems found")
	}

	detail := &models.StorageDetail{
		Controllers: make([]models.StorageController, 0),
		Disks:       make([]models.Disk, 0),
	}

	// Get Storage subsystems
	storageCollection, err := systems[0].Storage()
	if err != nil {
		return nil, fmt.Errorf("failed to get storage: %w", err)
	}

	for _, storage := range storageCollection {
		// Get controller info from StorageControllers
		for _, sc := range storage.StorageControllers {
			controller := models.StorageController{
				Name:              storage.Name,
				DeviceDescription: sc.Model,
				FirmwareVersion:   sc.FirmwareVersion,
				PCIeSlot:          "", // Will try to get from Location
			}
			if sc.Location.PartLocation.ServiceLabel != "" {
				controller.PCIeSlot = sc.Location.PartLocation.ServiceLabel
			}
			detail.Controllers = append(detail.Controllers, controller)
		}

		// Get drives
		drives, err := storage.Drives()
		if err != nil {
			log.Printf("Failed to get drives for %s: %v", storage.Name, err)
			continue
		}

		for _, drive := range drives {
			disk := models.Disk{
				Name:        drive.Name,
				State:       normalizeDriveState(string(drive.Status.State)),
				SlotNumber:  "",
				Size:        formatCapacity(drive.CapacityBytes),
				BusProtocol: string(drive.Protocol),
				MediaType:   string(drive.MediaType),
			}
			if drive.PhysicalLocation.PartLocation.ServiceLabel != "" {
				disk.SlotNumber = drive.PhysicalLocation.PartLocation.ServiceLabel
			}
			detail.Disks = append(detail.Disks, disk)
		}
	}

	return detail, nil
}
```

**Step 3: Run tests**

Run: `go test ./internal/redfish/... -v`
Expected: PASS

**Step 4: Commit**

```bash
git add internal/redfish/client.go
git commit -m "feat(redfish): add GetStorageDetails function"
```

---

### Task 4: Update Poller to Collect New Data

**Files:**
- Modify: `internal/poller/poller.go`

**Step 1: Read current poller implementation**

Read `internal/poller/poller.go` to find where node data is collected.

**Step 2: Add network adapter collection**

In the polling loop where node data is fetched (after health/thermal/power), add:

```go
// Get network adapter details
networkAdapters, err := p.redfishClient.GetNetworkAdapters(ctx, bmcAddress, creds.Username, creds.Password)
if err != nil {
	log.Printf("Failed to get network adapters for %s: %v", node.Name, err)
} else {
	node.NetworkAdapters = networkAdapters
}
```

**Step 3: Add storage details collection**

Add after network adapter collection:

```go
// Get storage details
storageDetail, err := p.redfishClient.GetStorageDetails(ctx, bmcAddress, creds.Username, creds.Password)
if err != nil {
	log.Printf("Failed to get storage details for %s: %v", node.Name, err)
} else {
	node.Storage = storageDetail
}
```

**Step 4: Run tests**

Run: `go test ./internal/poller/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/poller/poller.go
git commit -m "feat(poller): collect network adapter and storage details"
```

---

### Task 5: Add Frontend TypeScript Types

**Files:**
- Modify: `console-plugin/src/types.ts`

**Step 1: Add NetworkAdapter interface**

Add after `PowerSummary` interface (around line 40):

```typescript
export interface NetworkAdapter {
  name: string;
  model: string;
  port: string;
  linkStatus: 'Up' | 'Down' | 'Unknown';
  linkSpeed: string;
  macAddress: string;
}
```

**Step 2: Add StorageController interface**

Add after `NetworkAdapter`:

```typescript
export interface StorageController {
  name: string;
  deviceDescription: string;
  pcieSlot: string;
  firmwareVersion: string;
}
```

**Step 3: Add Disk interface**

Add after `StorageController`:

```typescript
export interface Disk {
  name: string;
  state: string;
  slotNumber: string;
  size: string;
  busProtocol: string;
  mediaType: string;
}
```

**Step 4: Add StorageDetail interface**

Add after `Disk`:

```typescript
export interface StorageDetail {
  controllers: StorageController[];
  disks: Disk[];
}
```

**Step 5: Update Node interface**

Add new fields to the Node interface after `powerSummary`:

```typescript
  networkAdapters?: NetworkAdapter[];
  storage?: StorageDetail;
```

**Step 6: Run tests**

Run: `cd console-plugin && npm test -- --watchAll=false`
Expected: PASS

**Step 7: Commit**

```bash
git add console-plugin/src/types.ts
git commit -m "feat(types): add NetworkAdapter, StorageController, Disk types"
```

---

### Task 6: Redesign NodeDetail Page

**Files:**
- Modify: `console-plugin/src/pages/NodeDetail.tsx`

**Step 1: Update imports**

Replace current imports with:

```typescript
import * as React from 'react';
import { useEffect, useState, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardTitle,
  CardBody,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Grid,
  GridItem,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
} from '@patternfly/react-table';
import { Node, HealthEvent } from '../types';
import { getNodes, getNodeEvents } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
```

**Step 2: Replace the return JSX with new layout**

Replace the entire return statement (starting around line 90) with the new section-based layout. The key sections are:

1. **Overview Card**: Manufacturer, Model, Service Tag, System Health, Power State, Redfish IP (clickable), Last Scanned
2. **Health Status Card**: 6-item grid with Processors, Memory, Network, Thermal, Power, Fans
3. **Networking Card**: Table with network adapters
4. **Storage Card**: Two tables - Controllers and Disks
5. **Power Card**: Status, Current Power, Redundancy, PSU health

**Step 3: Run tests**

Run: `cd console-plugin && npm test -- --testPathPattern=NodeDetail --watchAll=false`
Expected: Tests may fail - update tests in next task

**Step 4: Commit**

```bash
git add console-plugin/src/pages/NodeDetail.tsx
git commit -m "feat(NodeDetail): redesign with inline sections"
```

---

### Task 7: Update NodeDetail Tests

**Files:**
- Modify: `console-plugin/src/pages/NodeDetail.test.tsx`

**Step 1: Update mock data to include new fields**

Add to mockNode:

```typescript
networkAdapters: [
  {
    name: 'NIC.Integrated.1-1',
    model: 'Broadcom BCM5720',
    port: 'NIC.Integrated.1-1',
    linkStatus: 'Up' as const,
    linkSpeed: '10 Gbps',
    macAddress: 'AA:BB:CC:DD:EE:01',
  },
],
storage: {
  controllers: [
    {
      name: 'RAID.Integrated.1-1',
      deviceDescription: 'PERC H740P',
      pcieSlot: 'Slot 1',
      firmwareVersion: '51.14.0-3900',
    },
  ],
  disks: [
    {
      name: 'Physical Disk 0:1:0',
      state: 'Online',
      slotNumber: '0',
      size: '1.8 TB',
      busProtocol: 'SAS',
      mediaType: 'HDD',
    },
  ],
},
```

**Step 2: Update tests for new sections**

Replace tab-related tests with section tests:
- Test "renders Overview section"
- Test "displays System Health label"
- Test "renders clickable Redfish IP"
- Test "renders Health Status section"
- Test "renders Networking section with table"
- Test "renders Storage section with controllers and disks"
- Test "renders Power section"

**Step 3: Run tests**

Run: `cd console-plugin && npm test -- --testPathPattern=NodeDetail --watchAll=false`
Expected: PASS

**Step 4: Commit**

```bash
git add console-plugin/src/pages/NodeDetail.test.tsx
git commit -m "test(NodeDetail): update tests for section-based layout"
```

---

### Task 8: Clean Up Unused Tab Components

**Files:**
- Delete: `console-plugin/src/pages/tabs/HealthTab.tsx`
- Delete: `console-plugin/src/pages/tabs/ThermalTab.tsx`
- Delete: `console-plugin/src/pages/tabs/PowerTab.tsx`
- Modify: `console-plugin/src/pages/tabs/index.ts`

**Step 1: Update tabs index**

Update `console-plugin/src/pages/tabs/index.ts` to only export EventsTab:

```typescript
export { EventsTab } from './EventsTab';
```

**Step 2: Delete unused tab files**

```bash
rm console-plugin/src/pages/tabs/HealthTab.tsx
rm console-plugin/src/pages/tabs/ThermalTab.tsx
rm console-plugin/src/pages/tabs/PowerTab.tsx
```

**Step 3: Run all tests**

Run: `cd console-plugin && npm test -- --watchAll=false`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove unused tab components"
```

---

### Task 9: Build and Deploy for Testing

**Step 1: Build plugin image for x86_64**

```bash
podman build --platform linux/amd64 -t quay.io/cragr/openshift-baremetal-insights-plugin:latest console-plugin/
```

**Step 2: Push to registry**

```bash
podman push quay.io/cragr/openshift-baremetal-insights-plugin:latest
```

**Step 3: Restart deployment**

```bash
oc rollout restart deployment -n baremetal-insights -l app.kubernetes.io/component=plugin
oc rollout status deployment/baremetal-insights-openshift-baremetal-insights-plugin -n baremetal-insights --timeout=120s
```

**Step 4: Manual verification**

Navigate to a node detail page and verify:
- Overview section shows Manufacturer, Model, Service Tag, System Health, Power State, clickable Redfish IP, Last Scanned
- Health Status section shows 6 status items in a grid
- Networking section shows table with network adapters (may be empty if backend not deployed)
- Storage section shows controllers and disks tables (may be empty if backend not deployed)
- Power section shows status, current power, redundancy

**Step 5: Commit any fixes**

If fixes needed, commit with appropriate message.

---

### Task 10: Build and Deploy Backend

**Step 1: Build backend image for x86_64**

```bash
podman build --platform linux/amd64 -t quay.io/cragr/openshift-baremetal-insights:latest .
```

**Step 2: Push to registry**

```bash
podman push quay.io/cragr/openshift-baremetal-insights:latest
```

**Step 3: Restart backend deployment**

```bash
oc rollout restart deployment -n baremetal-insights -l app.kubernetes.io/component=backend
oc rollout status deployment/baremetal-insights-openshift-baremetal-insights-backend -n baremetal-insights --timeout=120s
```

**Step 4: Wait for data collection**

Wait for next poll interval (default 30m) or restart backend to trigger immediate poll.

**Step 5: Final verification**

Navigate to node detail page and verify all sections display real data from Redfish.
