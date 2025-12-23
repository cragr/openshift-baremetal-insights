# BareMetal Insights Plugin for OpenShift

<p align="center">
  <img src="images/img1.png" alt="BareMetal Insights Logo" width="350">
</p>

A vendor-agnostic OpenShift console plugin for monitoring and managing firmware on Redfish-compatible bare metal servers. Discovers nodes via BareMetalHost CRDs and queries server inventory through the Redfish API.

## Vendor Support

This plugin is designed to be **vendor-agnostic**, working with any server that implements the Redfish standard. However, initial development and testing has been performed using **Dell PowerEdge servers with iDRAC**.

We welcome contributions to expand vendor support! See [Contributing](#contributing) for details on adding support for HPE iLO, Lenovo XClarity, Supermicro, and other Redfish-compatible BMCs.

### Current Vendor Status

| Vendor | BMC | Status | Contributor |
|--------|-----|--------|-------------|
| Dell | iDRAC 8/9 | Tested | [@cragr](https://github.com/cragr) |
| HPE | iLO 5/6 | Untested | Contributions welcome |
| Lenovo | XClarity | Untested | Contributions welcome |
| Supermicro | BMC | Untested | Contributions welcome |

## Features

### Dashboard
Fleet-wide overview displaying:
- Total node count with health status breakdown (Healthy/Warning/Critical)
- Power state summary (On/Off)
- Firmware update summary by severity (Critical/Recommended/Optional)
- Active job status (Pending/In Progress/Completed)
- Recent events from the last 7 days

### Nodes
- List all discovered bare metal nodes with status indicators
- Filter by namespace
- View model, manufacturer, power state, and health at a glance
- Click through to detailed node view

### Node Detail
Comprehensive per-node information including:
- System overview (model, service tag, BMC address)
- Health rollup by subsystem (processors, memory, storage, network, fans, PSUs)
- Thermal summary with inlet temperature and fan status
- Power summary with current consumption and PSU redundancy
- Network adapters with link status and MAC addresses
- Storage controllers and physical disks
- Complete firmware inventory

### Firmware Management
Dual-view interface for firmware oversight:
- **Servers tab**: Server-centric view showing update counts per node
- **Components tab**: Component-level view across all servers
- Slide-out drawer with detailed firmware information per node
- Schedule updates with OnReboot mode
- Filter to show only components with available updates
- Search by node name, model, or component type

## Prerequisites

- OpenShift 4.14 or later
- Bare metal nodes with BareMetalHost CRDs (Metal3/IPI deployment)
- Redfish-compatible servers with BMC network access
- For Dell servers: network access to downloads.dell.com (firmware catalog)

## Quick Start

### Install via Helm

```bash
helm upgrade --install baremetal-insights helm/openshift-baremetal-insights/ \
  --namespace baremetal-insights \
  --create-namespace

# Enable the console plugin
oc patch consoles.operator.openshift.io cluster \
  --patch '{"spec":{"plugins":["openshift-baremetal-insights-plugin"]}}' \
  --type=merge
```

### Verify Installation

```bash
# Check pods are running
oc get pods -n baremetal-insights

# Check console plugin is registered
oc get consoleplugins
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `namespace.name` | `baremetal-insights` | Namespace for deployment |
| `backend.config.pollInterval` | `30m` | How often to scan BMCs |
| `backend.config.catalogRefresh` | `24h` | How often to refresh firmware catalog |
| `backend.image.tag` | `latest` | Backend image tag |
| `plugin.image.tag` | `latest` | Plugin image tag |
| `metrics.enabled` | `false` | Enable Prometheus ServiceMonitor |

### Example: Custom polling interval

```bash
helm upgrade --install baremetal-insights helm/openshift-baremetal-insights/ \
  --set backend.config.pollInterval=15m \
  --set metrics.enabled=true
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenShift Console                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Console Plugin (React/PatternFly)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Service (Go)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Redfish     │  │ Catalog     │  │ REST API            │  │
│  │ Client      │  │ Service     │  │ /api/v1/*           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ BareMetalHost   │  │ Vendor Catalog  │
│ CRDs + Secrets  │  │ (e.g., Dell)    │
└─────────────────┘  └─────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/nodes` | GET | List all discovered nodes |
| `/api/v1/nodes/{name}` | GET | Get specific node details |
| `/api/v1/nodes/{name}/firmware` | GET | Firmware for specific node |
| `/api/v1/nodes/{name}/health` | GET | Health rollup for node |
| `/api/v1/nodes/{name}/thermal` | GET | Thermal summary for node |
| `/api/v1/nodes/{name}/power` | GET | Power summary for node |
| `/api/v1/nodes/{name}/events` | GET | Events for specific node |
| `/api/v1/firmware` | GET | All firmware across fleet |
| `/api/v1/updates/schedule` | POST | Schedule firmware updates |
| `/api/v1/events` | GET | All events (with limit/node filters) |
| `/api/v1/dashboard` | GET | Dashboard statistics |
| `/api/v1/namespaces` | GET | Available namespaces |
| `/api/v1/tasks` | GET | Active/completed tasks |
| `/healthz` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |

## Development

### Build

```bash
# Build Go backend
make build

# Build console plugin
make plugin-build

# Run tests
make test
make plugin-test

# Build container images (linux/amd64)
make images
```

### Local Development

```bash
# Run backend locally
make run

# Run plugin dev server
cd console-plugin && npm run dev
```

### Deploy to Cluster

```bash
# Build and push images
make image-plugin
make push-plugin

# Deploy via Helm
make helm-install
```

## Contributing

Contributions are welcome! Areas where help is especially needed:

### Adding Vendor Support

1. **Test with your hardware**: Run the plugin against your servers and document any Redfish API differences
2. **Firmware catalog integration**: Add support for your vendor's firmware update catalog
3. **Documentation**: Document any vendor-specific configuration or quirks

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/add-hpe-support`)
3. Make your changes with tests
4. Submit a pull request

Please include:
- Hardware model and BMC version tested
- Any Redfish API deviations from the standard
- Screenshots if adding UI changes

## Troubleshooting

### Plugin not appearing in console

1. Check ConsolePlugin is registered: `oc get consoleplugins`
2. Verify plugin is enabled: `oc get consoles.operator.openshift.io cluster -o yaml`
3. Check plugin pod logs: `oc logs -n baremetal-insights -l app.kubernetes.io/component=plugin`

### No nodes discovered

1. Verify BareMetalHost CRDs exist: `oc get baremetalhosts -A`
2. Check backend logs: `oc logs -n baremetal-insights -l app.kubernetes.io/component=backend`
3. Ensure backend has RBAC to read BareMetalHosts and Secrets

### BMC connection failures

1. Verify network connectivity to BMC IPs from cluster
2. Check BMC credentials in referenced Secrets
3. Review backend logs for Redfish errors
4. Ensure BMC firmware supports Redfish API

## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.
