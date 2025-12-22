# Phase 4: Packaging & Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Package the application for production deployment with Helm chart, container images, metrics, and documentation.

**Architecture:** Helm chart bundles backend and console plugin deployments. Backend exposes Prometheus metrics via /metrics endpoint. Single README documents installation and usage.

**Tech Stack:** Helm 3, Prometheus client_golang, podman, Go 1.24

---

### Task 1: Prometheus Metrics Package

**Files:**
- Create: `internal/metrics/metrics.go`
- Create: `internal/metrics/metrics_test.go`

**Step 1: Create metrics package with counter**

```go
// internal/metrics/metrics.go
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// FirmwareScanTotal counts firmware scan operations per node
	FirmwareScanTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "firmware_scan_total",
			Help: "Total number of firmware scan operations",
		},
		[]string{"node", "status"},
	)
)

// RecordScan increments the scan counter for a node
func RecordScan(node string, success bool) {
	status := "success"
	if !success {
		status = "error"
	}
	FirmwareScanTotal.WithLabelValues(node, status).Inc()
}
```

**Step 2: Create test file**

```go
// internal/metrics/metrics_test.go
package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestRecordScan(t *testing.T) {
	// Reset counter for test isolation
	FirmwareScanTotal.Reset()

	RecordScan("worker-0", true)
	RecordScan("worker-0", true)
	RecordScan("worker-1", false)

	// Check worker-0 success count
	count := testutil.ToFloat64(FirmwareScanTotal.WithLabelValues("worker-0", "success"))
	if count != 2 {
		t.Errorf("expected 2, got %f", count)
	}

	// Check worker-1 error count
	count = testutil.ToFloat64(FirmwareScanTotal.WithLabelValues("worker-1", "error"))
	if count != 1 {
		t.Errorf("expected 1, got %f", count)
	}
}
```

**Step 3: Run tests**

Run: `go test -v ./internal/metrics/`
Expected: PASS

**Step 4: Commit**

```bash
git add internal/metrics/
git commit -m "feat: add Prometheus metrics package with scan counter"
```

---

### Task 2: Add Prometheus Dependency

**Files:**
- Modify: `go.mod`

**Step 1: Add prometheus client dependency**

Run: `go get github.com/prometheus/client_golang/prometheus`
Run: `go get github.com/prometheus/client_golang/prometheus/promhttp`
Run: `go mod tidy`

**Step 2: Verify tests still pass**

Run: `go test ./...`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add go.mod go.sum
git commit -m "chore: add prometheus client dependency"
```

---

### Task 3: Add Metrics Endpoint to API Server

**Files:**
- Modify: `internal/api/server.go`

**Step 1: Import promhttp and add /metrics route**

Add import:
```go
"github.com/prometheus/client_golang/prometheus/promhttp"
```

Add route in NewServer() after other routes:
```go
mux.Handle("/metrics", promhttp.Handler())
```

**Step 2: Run tests**

Run: `go test ./...`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add internal/api/server.go
git commit -m "feat: add /metrics endpoint for Prometheus scraping"
```

---

### Task 4: Integrate Metrics in Poller

**Files:**
- Modify: `internal/poller/poller.go`

**Step 1: Import metrics package and record scans**

Add import:
```go
"github.com/cragr/openshift-redfish-insights/internal/metrics"
```

In the scan loop, after successful firmware fetch:
```go
metrics.RecordScan(node.Name, true)
```

On error:
```go
metrics.RecordScan(node.Name, false)
```

**Step 2: Run tests**

Run: `go test ./...`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add internal/poller/poller.go
git commit -m "feat: record metrics for firmware scan operations"
```

---

### Task 5: Helm Chart Scaffolding

**Files:**
- Create: `helm/openshift-redfish-insights/Chart.yaml`
- Create: `helm/openshift-redfish-insights/values.yaml`
- Create: `helm/openshift-redfish-insights/templates/_helpers.tpl`

**Step 1: Create Chart.yaml**

```yaml
# helm/openshift-redfish-insights/Chart.yaml
apiVersion: v2
name: openshift-redfish-insights
description: Firmware visibility for Dell servers in OpenShift
type: application
version: 0.1.0
appVersion: "0.1.0"
keywords:
  - openshift
  - firmware
  - dell
  - redfish
maintainers:
  - name: Craig Robinson
```

**Step 2: Create values.yaml**

```yaml
# helm/openshift-redfish-insights/values.yaml
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
  service:
    port: 8080

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
  service:
    port: 9443

metrics:
  enabled: false
  port: 8080
  path: /metrics
```

**Step 3: Create _helpers.tpl**

```yaml
# helm/openshift-redfish-insights/templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "redfish-insights.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "redfish-insights.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "redfish-insights.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "redfish-insights.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "redfish-insights.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "redfish-insights.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Plugin selector labels
*/}}
{{- define "redfish-insights.plugin.selectorLabels" -}}
app.kubernetes.io/name: {{ include "redfish-insights.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: plugin
{{- end }}
```

**Step 4: Commit**

```bash
git add helm/
git commit -m "feat(helm): add chart scaffolding with values and helpers"
```

---

### Task 6: Helm Backend Templates

**Files:**
- Create: `helm/openshift-redfish-insights/templates/namespace.yaml`
- Create: `helm/openshift-redfish-insights/templates/backend-serviceaccount.yaml`
- Create: `helm/openshift-redfish-insights/templates/backend-clusterrole.yaml`
- Create: `helm/openshift-redfish-insights/templates/backend-clusterrolebinding.yaml`

**Step 1: Create namespace.yaml**

```yaml
# helm/openshift-redfish-insights/templates/namespace.yaml
{{- if .Values.namespace.create }}
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
{{- end }}
```

**Step 2: Create backend-serviceaccount.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
```

**Step 3: Create backend-clusterrole.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
rules:
  - apiGroups: ["metal3.io"]
    resources: ["baremetalhosts"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get"]
    resourceNames: []
```

**Step 4: Create backend-clusterrolebinding.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: {{ include "redfish-insights.fullname" . }}-backend
subjects:
  - kind: ServiceAccount
    name: {{ include "redfish-insights.fullname" . }}-backend
    namespace: {{ .Values.namespace.name }}
```

**Step 5: Commit**

```bash
git add helm/openshift-redfish-insights/templates/
git commit -m "feat(helm): add namespace and RBAC templates"
```

---

### Task 7: Helm Backend Deployment and Service

**Files:**
- Create: `helm/openshift-redfish-insights/templates/backend-configmap.yaml`
- Create: `helm/openshift-redfish-insights/templates/backend-deployment.yaml`
- Create: `helm/openshift-redfish-insights/templates/backend-service.yaml`

**Step 1: Create backend-configmap.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
data:
  POLL_INTERVAL: {{ .Values.backend.config.pollInterval | quote }}
  CATALOG_REFRESH: {{ .Values.backend.config.catalogRefresh | quote }}
  CATALOG_URL: {{ .Values.backend.config.catalogUrl | quote }}
  LOG_LEVEL: {{ .Values.backend.config.logLevel | quote }}
```

**Step 2: Create backend-deployment.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
spec:
  replicas: {{ .Values.backend.replicas }}
  selector:
    matchLabels:
      {{- include "redfish-insights.backend.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "redfish-insights.backend.selectorLabels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "redfish-insights.fullname" . }}-backend
      containers:
        - name: backend
          image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
          imagePullPolicy: {{ .Values.backend.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.backend.service.port }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "redfish-insights.fullname" . }}-backend
          resources:
            {{- toYaml .Values.backend.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
```

**Step 3: Create backend-service.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
spec:
  type: ClusterIP
  ports:
    - port: {{ .Values.backend.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "redfish-insights.backend.selectorLabels" . | nindent 4 }}
```

**Step 4: Commit**

```bash
git add helm/openshift-redfish-insights/templates/
git commit -m "feat(helm): add backend deployment, service, and configmap"
```

---

### Task 8: Helm Plugin Templates

**Files:**
- Create: `helm/openshift-redfish-insights/templates/plugin-deployment.yaml`
- Create: `helm/openshift-redfish-insights/templates/plugin-service.yaml`
- Create: `helm/openshift-redfish-insights/templates/plugin-consoleplugin.yaml`

**Step 1: Create plugin-deployment.yaml**

```yaml
# helm/openshift-redfish-insights/templates/plugin-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "redfish-insights.fullname" . }}-plugin
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: plugin
spec:
  replicas: {{ .Values.plugin.replicas }}
  selector:
    matchLabels:
      {{- include "redfish-insights.plugin.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "redfish-insights.plugin.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: plugin
          image: "{{ .Values.plugin.image.repository }}:{{ .Values.plugin.image.tag }}"
          imagePullPolicy: {{ .Values.plugin.image.pullPolicy }}
          ports:
            - name: https
              containerPort: 9443
              protocol: TCP
          resources:
            {{- toYaml .Values.plugin.resources | nindent 12 }}
          volumeMounts:
            - name: plugin-serving-cert
              mountPath: /var/serving-cert
              readOnly: true
      volumes:
        - name: plugin-serving-cert
          secret:
            secretName: {{ include "redfish-insights.fullname" . }}-plugin-cert
            defaultMode: 420
```

**Step 2: Create plugin-service.yaml**

```yaml
# helm/openshift-redfish-insights/templates/plugin-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: {{ include "redfish-insights.fullname" . }}-plugin
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: plugin
  annotations:
    service.beta.openshift.io/serving-cert-secret-name: {{ include "redfish-insights.fullname" . }}-plugin-cert
spec:
  type: ClusterIP
  ports:
    - port: {{ .Values.plugin.service.port }}
      targetPort: https
      protocol: TCP
      name: https
  selector:
    {{- include "redfish-insights.plugin.selectorLabels" . | nindent 4 }}
```

**Step 3: Create plugin-consoleplugin.yaml**

```yaml
# helm/openshift-redfish-insights/templates/plugin-consoleplugin.yaml
apiVersion: console.openshift.io/v1
kind: ConsolePlugin
metadata:
  name: redfish-insights-plugin
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
spec:
  displayName: "Firmware Insights"
  backend:
    type: Service
    service:
      name: {{ include "redfish-insights.fullname" . }}-plugin
      namespace: {{ .Values.namespace.name }}
      port: {{ .Values.plugin.service.port }}
      basePath: "/"
  proxy:
    - alias: redfish-insights
      endpoint:
        type: Service
        service:
          name: {{ include "redfish-insights.fullname" . }}-backend
          namespace: {{ .Values.namespace.name }}
          port: {{ .Values.backend.service.port }}
      authorize: true
```

**Step 4: Commit**

```bash
git add helm/openshift-redfish-insights/templates/
git commit -m "feat(helm): add plugin deployment, service, and consoleplugin"
```

---

### Task 9: Helm ServiceMonitor (Optional Metrics)

**Files:**
- Create: `helm/openshift-redfish-insights/templates/backend-servicemonitor.yaml`

**Step 1: Create backend-servicemonitor.yaml**

```yaml
# helm/openshift-redfish-insights/templates/backend-servicemonitor.yaml
{{- if .Values.metrics.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: {{ include "redfish-insights.fullname" . }}-backend
  namespace: {{ .Values.namespace.name }}
  labels:
    {{- include "redfish-insights.labels" . | nindent 4 }}
    app.kubernetes.io/component: backend
spec:
  selector:
    matchLabels:
      {{- include "redfish-insights.backend.selectorLabels" . | nindent 6 }}
  endpoints:
    - port: http
      path: {{ .Values.metrics.path }}
      interval: 30s
{{- end }}
```

**Step 2: Validate helm template renders**

Run: `helm template test helm/openshift-redfish-insights/`
Expected: Valid YAML output without errors

Run: `helm template test helm/openshift-redfish-insights/ --set metrics.enabled=true | grep -A 10 ServiceMonitor`
Expected: ServiceMonitor resource appears

**Step 3: Commit**

```bash
git add helm/openshift-redfish-insights/templates/
git commit -m "feat(helm): add optional ServiceMonitor for Prometheus"
```

---

### Task 10: Update Makefile with Image and Helm Targets

**Files:**
- Modify: `Makefile`

**Step 1: Replace Makefile with expanded version**

```makefile
.PHONY: build run test clean lint plugin-build plugin-test images push helm-package helm-install all

BINARY_NAME=openshift-redfish-insights
GO=go

# Image configuration
REGISTRY ?= quay.io/cragr
BACKEND_IMAGE ?= $(REGISTRY)/openshift-redfish-insights
PLUGIN_IMAGE ?= $(REGISTRY)/redfish-insights-plugin
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# Go targets
build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/server

run: build
	./bin/$(BINARY_NAME)

test:
	$(GO) test -v ./...

clean:
	rm -rf bin/
	rm -rf console-plugin/dist/
	rm -rf console-plugin/node_modules/

lint:
	golangci-lint run

# Plugin targets
plugin-build:
	cd console-plugin && npm ci && npm run build

plugin-test:
	cd console-plugin && npm test

# Image targets
image-backend:
	podman build -t $(BACKEND_IMAGE):$(VERSION) -t $(BACKEND_IMAGE):latest .

image-plugin:
	podman build -t $(PLUGIN_IMAGE):$(VERSION) -t $(PLUGIN_IMAGE):latest console-plugin/

images: image-backend image-plugin

push-backend:
	podman push $(BACKEND_IMAGE):$(VERSION)
	podman push $(BACKEND_IMAGE):latest

push-plugin:
	podman push $(PLUGIN_IMAGE):$(VERSION)
	podman push $(PLUGIN_IMAGE):latest

push: push-backend push-plugin

# Helm targets
helm-template:
	helm template redfish-insights helm/openshift-redfish-insights/

helm-package:
	helm package helm/openshift-redfish-insights/

helm-install:
	helm upgrade --install redfish-insights helm/openshift-redfish-insights/ \
		--namespace redfish-insights --create-namespace

helm-uninstall:
	helm uninstall redfish-insights --namespace redfish-insights

# Combined targets
all: build plugin-build

.DEFAULT_GOAL := build
```

**Step 2: Test Makefile targets**

Run: `make helm-template | head -50`
Expected: Valid YAML output

**Step 3: Commit**

```bash
git add Makefile
git commit -m "chore: expand Makefile with image and helm targets"
```

---

### Task 11: Add Health Check Endpoint

**Files:**
- Modify: `internal/api/server.go`

**Step 1: Add /healthz endpoint**

Add handler function:
```go
func healthzHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}
```

Add route in NewServer():
```go
mux.HandleFunc("/healthz", healthzHandler)
```

**Step 2: Run tests**

Run: `go test ./...`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add internal/api/server.go
git commit -m "feat: add /healthz endpoint for liveness/readiness probes"
```

---

### Task 12: Create README Documentation

**Files:**
- Create: `README.md`

**Step 1: Create comprehensive README**

```markdown
# OpenShift Redfish Insights

Kubernetes-native firmware visibility for Dell servers in OpenShift. Discovers bare metal nodes via BareMetalHost CRDs, queries iDRAC firmware inventory via Redfish API, and compares against Dell's firmware catalog to show available updates.

## Overview

- **Read-only visibility** - No automated firmware updates (V1 scope)
- **Dell servers only** - Supports iDRAC 8 and iDRAC 9
- **OpenShift Console integration** - Native UI under Compute section

## Prerequisites

- OpenShift 4.14 or later
- Bare metal nodes with BareMetalHost CRDs (Metal3/IPI deployment)
- Dell PowerEdge servers with iDRAC
- Network access from cluster to iDRAC management IPs
- Network access to downloads.dell.com (for firmware catalog)

## Quick Start

### Install via Helm

```bash
# Add the Helm repository (if published)
# helm repo add redfish-insights https://cragr.github.io/openshift-redfish-insights

# Install from local chart
helm upgrade --install redfish-insights helm/openshift-redfish-insights/ \
  --namespace redfish-insights \
  --create-namespace

# Enable the console plugin
oc patch consoles.operator.openshift.io cluster \
  --patch '{"spec":{"plugins":["redfish-insights-plugin"]}}' \
  --type=merge
```

### Verify Installation

```bash
# Check pods are running
oc get pods -n redfish-insights

# Check console plugin is registered
oc get consoleplugins
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `namespace.name` | `redfish-insights` | Namespace for deployment |
| `backend.config.pollInterval` | `30m` | How often to scan iDRACs |
| `backend.config.catalogRefresh` | `24h` | How often to fetch Dell catalog |
| `backend.image.tag` | `latest` | Backend image tag |
| `plugin.image.tag` | `latest` | Plugin image tag |
| `metrics.enabled` | `false` | Enable Prometheus ServiceMonitor |

### Example: Custom polling interval

```bash
helm upgrade --install redfish-insights helm/openshift-redfish-insights/ \
  --set backend.config.pollInterval=15m \
  --set metrics.enabled=true
```

## Accessing the UI

After installation, navigate to **Compute > Firmware Overview** in the OpenShift Console.

### Views

- **Firmware Overview** - Fleet-wide status dashboard
- **Firmware Nodes** - List of all nodes with firmware status
- **Firmware Node Detail** - Per-node firmware components
- **Firmware Updates** - Available updates grouped by component type

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
│ BareMetalHost   │  │ Dell Catalog    │
│ CRDs + Secrets  │  │ downloads.dell  │
└─────────────────┘  └─────────────────┘
```

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

# Build container images
make images
```

### Local Development

```bash
# Run backend locally
make run

# Run plugin dev server
cd console-plugin && npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/nodes` | GET | List all discovered nodes |
| `/api/v1/nodes/{name}/firmware` | GET | Firmware for specific node |
| `/api/v1/updates` | GET | All available updates |
| `/healthz` | GET | Health check |
| `/metrics` | GET | Prometheus metrics |

## Troubleshooting

### Plugin not appearing in console

1. Check ConsolePlugin is registered: `oc get consoleplugins`
2. Verify plugin is enabled: `oc get consoles.operator.openshift.io cluster -o yaml`
3. Check plugin pod logs: `oc logs -n redfish-insights -l app.kubernetes.io/component=plugin`

### No nodes discovered

1. Verify BareMetalHost CRDs exist: `oc get baremetalhosts -A`
2. Check backend logs: `oc logs -n redfish-insights -l app.kubernetes.io/component=backend`
3. Ensure backend has RBAC to read BareMetalHosts

### iDRAC connection failures

1. Verify network connectivity to iDRAC IPs from cluster
2. Check BMC credentials in referenced Secrets
3. Review backend logs for Redfish errors

## License

Apache License 2.0
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add comprehensive README with installation and usage"
```

---

### Task 13: Update .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Add helm and additional ignores**

```
# Binaries
bin/
*.exe

# Dependencies
console-plugin/node_modules/

# Build outputs
console-plugin/dist/

# Helm
*.tgz

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: update gitignore for helm packages"
```

---

### Task 14: Final Verification

**Step 1: Run all Go tests**

Run: `go test ./...`
Expected: All tests PASS

**Step 2: Run plugin tests**

Run: `cd console-plugin && npm test`
Expected: All tests PASS

**Step 3: Validate Helm chart**

Run: `helm lint helm/openshift-redfish-insights/`
Expected: No errors

Run: `helm template test helm/openshift-redfish-insights/`
Expected: Valid YAML, no errors

**Step 4: Build images (optional - requires podman)**

Run: `make images`
Expected: Both images build successfully

**Step 5: Final commit if any changes**

```bash
git status
# If clean, no action needed
```
