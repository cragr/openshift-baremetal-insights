# BareMetal Insights Rename Design

## Overview

Rename the project from "openshift-baremetal-insights" / "BareMetal Insights" to "openshift-baremetal-insights" / "BareMetal Insights" for better user-facing branding. The underlying technology remains Redfish-focused.

## Scope of Changes

### Go Module & Imports
- `go.mod`: `github.com/cragr/openshift-baremetal-insights` → `github.com/cragr/openshift-baremetal-insights`
- All `import` statements across `.go` files

### Kubernetes Resources
- Namespace: `baremetal-insights` → `baremetal-insights`
- All resource names containing `baremetal-insights` → `baremetal-insights`
- Helm chart name and references

### Console Plugin
- Menu item: "BareMetal Insights" → "BareMetal Insights"
- Plugin name in `package.json` and `plugin-manifest.json`
- URL paths: `/baremetal-insights/*` → `/baremetal-insights/*`

### Container Images
- `quay.io/cragr/openshift-baremetal-insights` → `quay.io/cragr/openshift-baremetal-insights`
- `quay.io/cragr/baremetal-insights-plugin` → `quay.io/cragr/openshift-baremetal-insights-plugin`

### Documentation
- README.md
- All design docs and plan files in `docs/plans/`
- CLAUDE.md

## Rename Strategy

### Order of Operations

1. **Code changes first** (in a branch)
   - Update all file contents with new names
   - Update Go module path
   - Run `go mod tidy` to fix dependencies
   - Build and test locally

2. **Create new container repos on Quay.io**
   - `quay.io/cragr/openshift-baremetal-insights`
   - `quay.io/cragr/openshift-baremetal-insights-plugin`

3. **Rename GitHub repo**
   - Rename in GitHub settings (Settings → General → Repository name)
   - GitHub auto-redirects old URLs temporarily

4. **Update local git remote**
   - `git remote set-url origin https://github.com/cragr/openshift-baremetal-insights.git`

5. **Deploy to cluster**
   - Uninstall old Helm release
   - Install fresh with new namespace/names

### What Stays the Same

Internal package names (like `internal/redfish/`) remain unchanged since they describe the technology being used, not the product name.

## Files to Modify

### Go Backend (~15 files)
- `go.mod` - module path
- `cmd/server/main.go` - imports
- `internal/api/*.go` - imports
- `internal/catalog/*.go` - imports
- `internal/discovery/*.go` - imports
- `internal/metrics/*.go` - imports
- `internal/models/*.go` - imports
- `internal/poller/*.go` - imports
- `internal/redfish/*.go` - imports
- `internal/store/*.go` - imports

### Helm Chart (10+ files)
- Rename directory: `charts/openshift-baremetal-insights/` → `charts/openshift-baremetal-insights/`
- `Chart.yaml` - name, description
- `values.yaml` - image repos, namespace default
- All templates - resource names, labels, selectors

### Console Plugin (8 files)
- `package.json` - name field
- `plugin-manifest.json` - name, displayName
- `src/plugin.ts` - navigation labels, paths
- `src/pages/*.tsx` - hardcoded route paths

### Documentation (10+ files)
- `README.md`
- `docs/plans/*.md` - update references
- `CLAUDE.md`

### Build
- `Makefile` - image names

## Testing & Verification

### Pre-deploy Verification
- `go build ./...` - compiles with new module path
- `go test ./...` - all tests pass
- `npm run build` (in console-plugin) - plugin builds
- `helm template` - renders valid YAML with new names

### Post-deploy Verification
- New namespace `baremetal-insights` created
- Backend pod running, `/healthz` returns 200
- Plugin registered in OpenShift console
- "BareMetal Insights" appears in navigation menu
- All pages load correctly at `/baremetal-insights/*` paths
- API calls work through console proxy

### Cleanup
- Remove old Helm release from `baremetal-insights` namespace
- Delete old namespace if empty
- Old Quay.io repos can be deleted after confirming new ones work
