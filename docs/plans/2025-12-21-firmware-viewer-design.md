# Dell Firmware Viewer for OpenShift - Design Document

## Overview

A Kubernetes-native application that displays Dell server firmware status in the OpenShift console. Discovers bare metal nodes via BareMetalHost CRDs, queries iDRAC firmware inventory via Redfish API, and compares against Dell's firmware catalog to show available updates.

**Scope (V1)**: Read-only visibility. No automated firmware updates.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenShift Console                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Dynamic Console Plugin (React/TS)             │  │
│  │   Fleet Overview │ Node View │ Component View         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Service (Go)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Redfish     │  │ Catalog     │  │ REST API            │  │
│  │ Client      │  │ Service     │  │ (serves plugin)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ BareMetalHost   │  │ Dell Catalog    │
│ CRDs + Secrets  │  │ (downloads.     │
│                 │  │  dell.com)      │
└─────────────────┘  └─────────────────┘
```

### Data Flow

1. Backend watches BareMetalHost CRDs to discover servers and credentials
2. Periodically polls each iDRAC via Redfish to collect firmware inventory
3. Fetches Dell catalog, parses XML to find available updates per model
4. Caches results in memory
5. Console plugin queries backend REST API to render views

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| BMC Communication | Redfish API (primary) | REST-based, modern, Go-friendly |
| Server Discovery | BareMetalHost CRDs | Already present in Metal3/OpenShift Bare Metal IPI |
| Firmware Catalog | Dell online (downloads.dell.com) | Simplest for connected clusters |
| Update Orchestration | Display only (V1) | Reduce risk, deliver visibility first |
| Deployment Model | Helm chart | Faster to build than operator, can evolve later |
| Console Plugin | PatternFly 6 | Required for OpenShift 4.19+ compatibility |

## Backend Service Design

### Project Structure

```
cmd/
  server/main.go           # Entry point
internal/
  api/                     # REST API handlers
    handlers.go            # /nodes, /firmware, /updates endpoints
    server.go              # HTTP server setup
  discovery/
    baremetalhost.go       # Watch BMH CRDs, extract BMC info
  redfish/
    client.go              # Redfish HTTP client
    firmware.go            # Parse firmware inventory responses
  catalog/
    dell.go                # Fetch/parse Dell catalog XML
    cache.go               # Cache catalog with TTL
  models/
    types.go               # Node, FirmwareComponent, Update structs
```

### Key Behaviors

**Discovery**: Uses client-go to watch `BareMetalHost` resources in `openshift-machine-api` namespace. Extracts BMC address and credential Secret reference. Filters to Dell hardware only.

**Polling**: Configurable interval (default 30 min). Connects to each iDRAC's Redfish endpoint (`/redfish/v1/UpdateService/FirmwareInventory`). Stores results in memory map keyed by node name.

**Catalog Sync**: Fetches Dell's enterprise catalog XML daily. Parses to build lookup table: `(system model + component ID) → latest version + download URL`.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/nodes` | GET | List all discovered nodes with firmware summary |
| `/api/v1/nodes/{name}/firmware` | GET | Detailed firmware for one node |
| `/api/v1/updates` | GET | All available updates grouped by component |

## Console Plugin Design

### Project Structure

```
console-plugin/
  package.json
  src/
    components/
      FleetOverview/        # Dashboard with status cards
      NodeFirmwareView/     # Detail view for single node
      ComponentGroupView/   # Group updates by firmware type
      FirmwareTable/        # Reusable table component
    services/
      api.ts                # Fetch from backend REST API
    utils/
      status.ts             # Determine up-to-date vs needs-update
```

### Plugin Registration

Extends OpenShift console via `ConsolePlugin` CR:
- Adds "Firmware" navigation item under Compute section
- Optionally adds firmware status badge to Node detail pages

### Views

**Fleet Overview** (landing page)
- Status cards: "X nodes up-to-date", "Y nodes need updates", "Z unreachable"
- Sortable table: Node | Model | Status | Last Scanned
- Click node → Node Firmware View

**Node Firmware View**
- Header: Node name, server model, iDRAC IP, last scan time
- Table: Component | Current Version | Available Version | Severity
- Components: BIOS, iDRAC, NIC firmware, RAID controller, PSU, etc.

**Component Group View**
- Accordion or tabs per component type
- Shows which nodes need that specific update
- Useful for planning: "5 nodes need BIOS 2.19.1"

### Tech Stack

- PatternFly 6
- React 18
- webpack
- OpenShift dynamic plugin SDK

## Helm Chart

### Structure

```
helm/openshift-baremetal-insights/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml         # Backend pod
    service.yaml            # ClusterIP for backend
    consoleplugin.yaml      # ConsolePlugin CR to register with OCP
    serviceaccount.yaml     # SA for backend
    clusterrole.yaml        # Read BareMetalHost, Secrets
    clusterrolebinding.yaml
    configmap.yaml          # Polling intervals, catalog URL, etc.
```

### Configuration

```yaml
replicaCount: 1
image:
  repository: quay.io/yourorg/openshift-baremetal-insights
  tag: latest

config:
  pollInterval: "30m"          # How often to scan iDRACs
  catalogRefresh: "24h"        # How often to fetch Dell catalog
  catalogUrl: "https://downloads.dell.com/catalog/Catalog.xml.gz"

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### RBAC Requirements

- `get`, `list`, `watch` on `BareMetalHost` in `metal3.io` API group
- `get` on `Secrets` (for BMC credentials) in `openshift-machine-api` namespace

## Error Handling

| Scenario | Handling |
|----------|----------|
| iDRAC unreachable | Mark node as "Unknown" status, show last successful scan time, retry on next poll |
| Invalid BMC credentials | Log warning, mark node "Auth Failed", don't block other nodes |
| Dell catalog unavailable | Use cached catalog, show "Catalog stale" indicator in UI |
| Non-Dell hardware | Skip gracefully - only process nodes where Redfish returns Dell manufacturer |
| Redfish API variations | Handle both iDRAC 8 and iDRAC 9 response formats |

## Security Considerations

- **BMC credentials**: Never logged, never exposed via API. Backend reads from Secrets, uses in-memory only for Redfish calls.
- **Network policy**: Backend needs egress to iDRAC IPs (usually management VLAN) and downloads.dell.com. Consider NetworkPolicy to restrict.
- **RBAC**: Service account has minimal permissions - read-only on BMH and Secrets in specific namespace.
- **TLS to iDRAC**: Redfish client skips certificate verification by default (iDRACs use self-signed certs) but configurable.
- **Console plugin proxy**: Plugin requests go through OpenShift console's proxy to backend Service, inheriting user's RBAC.

## Observability

**Prometheus metrics:**
- `firmware_scan_total` - Counter of scan operations
- `firmware_outdated_components` - Gauge of components needing updates
- `catalog_sync_timestamp` - Timestamp of last successful catalog sync

**Logging**: Structured JSON with node names, scan durations, errors.

## Implementation Phases

### Phase 1 - Backend Foundation
- Project scaffolding (Go modules, Dockerfile, Makefile)
- BareMetalHost discovery with client-go
- Redfish client - connect and fetch firmware inventory
- In-memory storage of firmware data

### Phase 2 - Catalog Integration
- Fetch and parse Dell catalog XML
- Match installed firmware to available updates
- REST API endpoints (`/nodes`, `/nodes/{name}/firmware`, `/updates`)

### Phase 3 - Console Plugin
- OpenShift plugin scaffolding with PatternFly 6
- Fleet Overview dashboard
- Node Firmware View
- Component Group View
- ConsolePlugin CR registration

### Phase 4 - Packaging & Polish
- Helm chart with all resources
- Container image builds (multi-arch if needed)
- Documentation (README, installation guide)
- Prometheus metrics integration

## Future Considerations (V2+)

- Firmware update orchestration with drain/cordon
- Maintenance window scheduling
- Operator conversion with CRDs for FirmwarePolicy
- Air-gapped support with local catalog mirror
- Support for other vendors (HPE iLO, Lenovo XCC)
