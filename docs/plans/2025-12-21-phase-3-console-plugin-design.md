# Phase 3: Console Plugin Design

## Overview

OpenShift Console Plugin using PatternFly 6 to display firmware inventory and update status for bare metal nodes.

**Goal:** Provide operators visibility into fleet firmware status directly within OpenShift Console.

**Tech Stack:** TypeScript, React, PatternFly 6, OpenShift Dynamic Plugin SDK, nginx

---

## Navigation Structure

Three entries under **Compute** section in admin perspective:

1. **Firmware Overview** - Dashboard with summary metrics
2. **Firmware Nodes** - Table of all nodes with firmware status
3. **Firmware Updates** - Grouped view of available updates

---

## Project Structure

```
console-plugin/
├── src/
│   ├── components/
│   │   ├── FirmwareStatusIcon.tsx
│   │   ├── NodeTable.tsx
│   │   └── UpdateBadge.tsx
│   ├── pages/
│   │   ├── FirmwareOverview.tsx
│   │   ├── FirmwareNodes.tsx
│   │   ├── FirmwareNodeDetail.tsx
│   │   └── FirmwareUpdates.tsx
│   ├── services/
│   │   └── api.ts
│   └── plugin.ts
├── console-extensions.json
├── plugin-manifest.json
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## Page Designs

### Firmware Overview (Dashboard)

- **Summary Cards:** Total Nodes, Nodes Needing Updates, Critical Updates, Last Scan Time
- **Status Chart:** Donut chart showing node status distribution
- **Activity List:** Nodes with most pending updates

### Firmware Nodes (List)

- **Table Columns:** Name, Model, Status, Firmware Count, Updates Available, Last Scanned
- **Toolbar:** Search by name, Filter by status, Refresh button
- **Interaction:** Row click navigates to node detail
- **Status Badges:** Green (up-to-date), Yellow (needs-update), Gray (unknown)

### Firmware Node Detail

- **Header:** Node name, model, manufacturer, service tag
- **Firmware Table:** Component Name, Type, Current Version, Available Version, Status
- **Highlighting:** Components needing updates shown with warning icon

### Firmware Updates (Grouped)

- **Grouping:** By component type + available version
- **Columns:** Component Type, Available Version, Affected Node Count, Node Names (expandable)
- **Purpose:** Identify fleet-wide update opportunities

---

## Console Integration

### Navigation Extensions

```json
[
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-overview",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Overview",
      "href": "/firmware"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-nodes",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Nodes",
      "href": "/firmware/nodes"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "firmware-updates",
      "perspective": "admin",
      "section": "compute",
      "name": "Firmware Updates",
      "href": "/firmware/updates"
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/firmware",
      "component": { "$codeRef": "FirmwareOverview" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/firmware/nodes",
      "component": { "$codeRef": "FirmwareNodes" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/firmware/nodes/:name",
      "component": { "$codeRef": "FirmwareNodeDetail" }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "path": "/firmware/updates",
      "component": { "$codeRef": "FirmwareUpdates" }
    }
  }
]
```

### Proxy Configuration

```json
{
  "name": "redfish-insights-plugin",
  "version": "0.1.0",
  "displayName": "Firmware Insights",
  "proxy": {
    "services": [{
      "alias": "redfish-insights",
      "serviceName": "openshift-redfish-insights",
      "serviceNamespace": "redfish-insights",
      "servicePort": 8080
    }]
  }
}
```

### API Client

```typescript
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';

const API_BASE = '/api/proxy/plugin/redfish-insights-plugin/redfish-insights';

export const getNodes = () => consoleFetchJSON(`${API_BASE}/api/v1/nodes`);
export const getNodeFirmware = (name: string) => consoleFetchJSON(`${API_BASE}/api/v1/nodes/${name}/firmware`);
export const getUpdates = () => consoleFetchJSON(`${API_BASE}/api/v1/updates`);
```

---

## Deployment

### Container

- Multi-stage Dockerfile: Node.js build → nginx runtime
- Serves static assets on port 9443 (HTTPS)
- TLS via OpenShift service serving certificates

### Kubernetes Resources

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redfish-insights-plugin
  namespace: redfish-insights
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redfish-insights-plugin
  template:
    spec:
      containers:
      - name: plugin
        image: redfish-insights-plugin:latest
        ports:
        - containerPort: 9443
        volumeMounts:
        - name: serving-cert
          mountPath: /var/cert
      volumes:
      - name: serving-cert
        secret:
          secretName: redfish-insights-plugin-cert
---
# Service
apiVersion: v1
kind: Service
metadata:
  name: redfish-insights-plugin
  annotations:
    service.beta.openshift.io/serving-cert-secret-name: redfish-insights-plugin-cert
spec:
  ports:
  - port: 9443
    targetPort: 9443
  selector:
    app: redfish-insights-plugin
---
# ConsolePlugin CR
apiVersion: console.openshift.io/v1
kind: ConsolePlugin
metadata:
  name: redfish-insights-plugin
spec:
  displayName: "Firmware Insights"
  backend:
    type: Service
    service:
      name: redfish-insights-plugin
      namespace: redfish-insights
      port: 9443
      basePath: "/"
```

### Enable Plugin

```bash
oc patch console.operator cluster --type=merge \
  -p '{"spec":{"plugins":["redfish-insights-plugin"]}}'
```

---

## Testing

### Local Development

- Backend: Run locally or port-forward to cluster
- Frontend: `npm run start` with console bridge for hot reload
- Mocking: Mock API responses for offline development

### Test Strategy

- **Unit Tests:** Jest for utility functions, API parsing
- **Component Tests:** React Testing Library for UI components
- **Build Verification:** `npm run build` succeeds, container builds, plugin loads

### Key Dependencies

- `@openshift-console/dynamic-plugin-sdk` - Console integration
- `@patternfly/react-core` v6 - UI components
- `@patternfly/react-table` v6 - Data tables
- `@patternfly/react-charts` v6 - Charts

---

## API Endpoints Used

| Endpoint | Page | Purpose |
|----------|------|---------|
| `GET /api/v1/nodes` | Overview, Nodes | List all nodes with status |
| `GET /api/v1/nodes/{name}/firmware` | Node Detail | Firmware components for node |
| `GET /api/v1/updates` | Updates | Grouped update view |
| `GET /api/v1/health` | All | Backend health check |
