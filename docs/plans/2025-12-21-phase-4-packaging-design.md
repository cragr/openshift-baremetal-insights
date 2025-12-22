# Phase 4: Packaging & Polish - Design Document

## Overview

Package the OpenShift Redfish Insights application for production deployment with Helm chart, container images, minimal Prometheus metrics, and documentation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Container Registry | quay.io/cragr/ | OpenShift ecosystem standard, free public images |
| Architecture | AMD64 only | Covers 95%+ deployments, simpler builds |
| Metrics Scope | Minimal (scan_total) | Start simple, add more later |
| Default Namespace | redfish-insights | Dedicated namespace, clear ownership |
| Documentation | Single README | Lean docs, everything in one place |

## Helm Chart Structure

```
helm/openshift-redfish-insights/
  Chart.yaml
  values.yaml
  templates/
    _helpers.tpl
    namespace.yaml
    backend-deployment.yaml
    backend-service.yaml
    backend-serviceaccount.yaml
    backend-clusterrole.yaml
    backend-clusterrolebinding.yaml
    backend-configmap.yaml
    backend-servicemonitor.yaml
    plugin-deployment.yaml
    plugin-service.yaml
    plugin-consoleplugin.yaml
```

## Values Configuration

```yaml
namespace:
  create: true
  name: openshift-redfish-insights

backend:
  image:
    repository: quay.io/cragr/openshift-redfish-insights
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  config:
    pollInterval: "30m"
    catalogRefresh: "24h"
    catalogUrl: "https://downloads.dell.com/catalog/Catalog.xml.gz"
    logLevel: "info"

plugin:
  image:
    repository: quay.io/cragr/redfish-insights-plugin
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "100m"

metrics:
  enabled: false
  port: 8080
  path: /metrics
```

## Container Images

**Repositories:**
- `quay.io/cragr/openshift-redfish-insights` - Go backend
- `quay.io/cragr/redfish-insights-plugin` - Console plugin (nginx)

**Tagging:**
- `latest` - Development/testing
- Git tag/commit hash - Versioned releases

**Build tool:** podman

## Makefile Targets

```makefile
REGISTRY ?= quay.io/cragr
BACKEND_IMAGE ?= $(REGISTRY)/openshift-redfish-insights
PLUGIN_IMAGE ?= $(REGISTRY)/redfish-insights-plugin
VERSION ?= $(shell git describe --tags --always --dirty)

image-backend    # Build backend image
image-plugin     # Build plugin image
images           # Build both
push-backend     # Push backend image
push-plugin      # Push plugin image
push             # Push both
helm-package     # Package Helm chart
helm-install     # Install/upgrade via Helm
```

## Prometheus Metrics

**Single metric:**
```go
var FirmwareScanTotal = prometheus.NewCounterVec(
    prometheus.CounterOpts{
        Name: "firmware_scan_total",
        Help: "Total number of firmware scan operations",
    },
    []string{"node", "status"},
)
```

**Endpoint:** `GET /metrics` on backend service

**ServiceMonitor:** Created only when `metrics.enabled=true`

## Documentation

Single README.md covering:
- Overview and architecture
- Prerequisites (OpenShift 4.14+, BMH CRDs, Dell servers)
- Quick start installation
- Configuration reference
- Accessing the UI
- Development setup
- License (Apache 2.0)

## Deliverables

1. `helm/openshift-redfish-insights/` - Complete Helm chart (12 templates)
2. Updated `Makefile` - Image and Helm targets
3. `internal/metrics/metrics.go` - Prometheus metrics package
4. Backend `/metrics` endpoint
5. `README.md` - Project documentation

## Not Included (YAGNI)

- Multi-arch builds (ARM64)
- GitHub Actions CI/CD
- Helm repository hosting
- Additional metrics (outdated_components, catalog_sync_timestamp)
