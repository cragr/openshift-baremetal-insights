# BareMetal Insights Plugin for OpenShift

<p align="center">
  <img src="images/img1.png" alt="BareMetal Insights Logo" width="350">
</p>

An OpenShift console plugin for monitoring and managing firmware on Redfish-compatible bare metal servers. Discovers nodes via BareMetalHost CRDs and queries server inventory through the Redfish API.

This plugin is designed to be vendor-agnostic, working with any server that implements the Redfish standard. However, initial development and testing has been performed using only Dell PowerEdge servers with iDRAC.

We welcome contributions to expand vendor support! See [Contributing](#contributing) for details on adding support for HPE iLO, Lenovo XClarity, Supermicro, and other Redfish-compatible BMCs.

### Current Vendor Testing

| Vendor | BMC | Status | Contributor |
|--------|-----|--------|-------------|
| Dell | iDRAC 8/9 | Testing Incomplete | [@cragr](https://github.com/cragr) |
| HPE | iLO 5/6 | Untested | Contributions welcome |
| Lenovo | XClarity | Untested | Contributions welcome |
| Supermicro | BMC | Untested | Contributions welcome |

## Demo

![](https://raw.githubusercontent.com/cragr/openshift-baremetal-insights/refs/heads/main/images/demo.gif)

## Prerequisites

- Standalone or ACM OCP cluster (non-spoke)
- Git
- Helm 3+
- OpenShift 4.14 or later
- Bare metal nodes with BareMetalHost CRDs (Metal3/IPI deployment)
- Redfish-compatible servers with BMC network access
- For Dell servers: network access to downloads.dell.com (firmware catalog)

## Quick Start

### Install via Helm

```bash
# Clone the repo
git clone https://github.com/cragr/openshift-baremetal-insights.git

# Change to the repo directory
cd openshift-baremetal-insights

# Create a new project in OpenShift
oc new-project baremetal-insights

#Install the helm cart
helm upgrade --install baremetal-insights helm/openshift-baremetal-insights/ \
  --namespace baremetal-insights

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

## Features

### Dashboard
Fleet-wide overview displaying:
- Total node count with health status breakdown (Healthy/Warning/Critical)
- Power state summary (On/Off)
- Firmware update summary by severity (Critical/Recommended/Optional)

### Nodes
- List all discovered bare metal nodes with status indicators
- Filter by namespace
- View model, manufacturer, power state, and health at a glance
- Click through to detailed node view

### Node Detail
Comprehensive per-node information including:
- System overview (model, service tag, BMC address)
- Health rollup by subsystem (processors, memory, storage, network, fans, PSUs)
- Power summary with current consumption and PSU redundancy
- Network adapters with link status and MAC addresses
- Storage controllers and physical disks

### Firmware Management
Dual-view interface for firmware oversight:
- **Servers tab**: Server-centric view showing update counts per node
- **Components tab**: Component-level view across all servers
- Slide-out drawer with detailed firmware information per node
- Schedule updates with OnReboot mode
- Filter to show only components with available updates
- Search by node name, model, or component type

## Troubleshooting
If you run into issues, see the [Troubleshooting guide](TROUBLESHOOTING.md).

## Contributing
If you’d like to contribute, please review the [Contributing guidelines](CONTRIBUTING.md) before submitting a pull request.

## Development
For local setup, build instructions, and development workflows, see the [Development guide](DEVELOPMENT.md).


## License

Apache License 2.0 - See [LICENSE](LICENSE) for details.