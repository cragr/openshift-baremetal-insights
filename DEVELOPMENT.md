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