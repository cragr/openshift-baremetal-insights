# BareMetal Insights Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the project from "openshift-redfish-insights" to "openshift-baremetal-insights" across all code, configs, and documentation.

**Architecture:** Global find-and-replace across Go module, Helm chart, console plugin, and documentation. The internal `internal/redfish/` package stays unchanged as it describes the technology, not the product.

**Tech Stack:** Go 1.25, React/TypeScript, Helm, Kubernetes

---

### Task 1: Update Go Module Path

**Files:**
- Modify: `go.mod`

**Step 1: Update module path in go.mod**

Edit `go.mod` line 1:
```
module github.com/cragr/openshift-baremetal-insights
```

**Step 2: Update all Go import statements**

Run:
```bash
find . -name "*.go" -exec sed -i '' 's|github.com/cragr/openshift-redfish-insights|github.com/cragr/openshift-baremetal-insights|g' {} \;
```

**Step 3: Run go mod tidy**

Run: `go mod tidy`
Expected: No errors

**Step 4: Verify build**

Run: `go build ./...`
Expected: Success, no errors

**Step 5: Verify tests**

Run: `go test ./...`
Expected: All tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename Go module to openshift-baremetal-insights"
```

---

### Task 2: Rename Helm Chart Directory and Update Chart.yaml

**Files:**
- Rename: `helm/openshift-redfish-insights/` → `helm/openshift-baremetal-insights/`
- Modify: `helm/openshift-baremetal-insights/Chart.yaml`

**Step 1: Rename Helm chart directory**

Run:
```bash
mv helm/openshift-redfish-insights helm/openshift-baremetal-insights
```

**Step 2: Update Chart.yaml**

Edit `helm/openshift-baremetal-insights/Chart.yaml`:
- Change `name: openshift-redfish-insights` → `name: openshift-baremetal-insights`
- Change description to reference "BareMetal Insights"

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: rename Helm chart to openshift-baremetal-insights"
```

---

### Task 3: Update Helm values.yaml

**Files:**
- Modify: `helm/openshift-baremetal-insights/values.yaml`

**Step 1: Update namespace default**

Change:
```yaml
namespace: redfish-insights
```
To:
```yaml
namespace: baremetal-insights
```

**Step 2: Update image repositories**

Change:
```yaml
backend:
  image:
    repository: quay.io/cragr/openshift-redfish-insights
```
To:
```yaml
backend:
  image:
    repository: quay.io/cragr/openshift-baremetal-insights
```

Change plugin image:
```yaml
plugin:
  image:
    repository: quay.io/cragr/redfish-insights-plugin
```
To:
```yaml
plugin:
  image:
    repository: quay.io/cragr/openshift-baremetal-insights-plugin
```

**Step 3: Commit**

```bash
git add helm/openshift-baremetal-insights/values.yaml
git commit -m "refactor: update Helm values for baremetal-insights"
```

---

### Task 4: Update Helm Templates

**Files:**
- Modify: All files in `helm/openshift-baremetal-insights/templates/`

**Step 1: Update all template files**

Run:
```bash
cd helm/openshift-baremetal-insights/templates
sed -i '' 's/redfish-insights/baremetal-insights/g' *.yaml
sed -i '' 's/openshift-redfish-insights/openshift-baremetal-insights/g' *.yaml
```

**Step 2: Verify Helm template renders**

Run:
```bash
helm template test helm/openshift-baremetal-insights --set namespace=baremetal-insights
```
Expected: Valid YAML output with `baremetal-insights` references

**Step 3: Commit**

```bash
git add helm/openshift-baremetal-insights/templates/
git commit -m "refactor: update Helm templates for baremetal-insights"
```

---

### Task 5: Update Console Plugin package.json

**Files:**
- Modify: `console-plugin/package.json`

**Step 1: Update package name**

Change:
```json
"name": "redfish-insights-plugin"
```
To:
```json
"name": "openshift-baremetal-insights-plugin"
```

**Step 2: Commit**

```bash
git add console-plugin/package.json
git commit -m "refactor: rename console plugin package"
```

---

### Task 6: Update Console Plugin Manifest

**Files:**
- Modify: `console-plugin/plugin-manifest.json`

**Step 1: Update plugin name and displayName**

Change:
```json
{
  "name": "redfish-insights-plugin",
  "displayName": "Redfish Insights",
```
To:
```json
{
  "name": "openshift-baremetal-insights-plugin",
  "displayName": "BareMetal Insights",
```

**Step 2: Commit**

```bash
git add console-plugin/plugin-manifest.json
git commit -m "refactor: update plugin manifest for BareMetal Insights"
```

---

### Task 7: Update Console Plugin Routes and Navigation

**Files:**
- Modify: `console-plugin/console-extensions.json`

**Step 1: Update navigation section name**

Change `"name": "Redfish Insights"` → `"name": "BareMetal Insights"`

**Step 2: Update all route paths**

Change all `/redfish-insights/` → `/baremetal-insights/`

**Step 3: Commit**

```bash
git add console-plugin/console-extensions.json
git commit -m "refactor: update console extensions for baremetal-insights routes"
```

---

### Task 8: Update Console Plugin Page Components

**Files:**
- Modify: `console-plugin/src/pages/FirmwarePage.tsx`
- Modify: `console-plugin/src/pages/FirmwareNodes.tsx`
- Modify: `console-plugin/src/pages/FirmwareNodeDetail.tsx`
- Modify: `console-plugin/src/pages/FirmwareNodeDetail.test.tsx`
- Modify: `console-plugin/src/pages/tabs/NodesTab.tsx`
- Modify: `console-plugin/src/services/api.ts`

**Step 1: Update all route references in page components**

Run:
```bash
cd console-plugin/src
find . -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|/redfish-insights/|/baremetal-insights/|g'
```

**Step 2: Verify plugin builds**

Run:
```bash
cd console-plugin && npm run build
```
Expected: Build succeeds

**Step 3: Commit**

```bash
git add console-plugin/src/
git commit -m "refactor: update page routes for baremetal-insights"
```

---

### Task 9: Update Makefile

**Files:**
- Modify: `Makefile`

**Step 1: Update image names in Makefile**

Change:
```makefile
IMAGE_REPO ?= quay.io/cragr/openshift-redfish-insights
PLUGIN_IMAGE_REPO ?= quay.io/cragr/redfish-insights-plugin
```
To:
```makefile
IMAGE_REPO ?= quay.io/cragr/openshift-baremetal-insights
PLUGIN_IMAGE_REPO ?= quay.io/cragr/openshift-baremetal-insights-plugin
```

**Step 2: Update Helm chart path references**

Change any `helm/openshift-redfish-insights` → `helm/openshift-baremetal-insights`

**Step 3: Commit**

```bash
git add Makefile
git commit -m "refactor: update Makefile for baremetal-insights images"
```

---

### Task 10: Update README.md

**Files:**
- Modify: `README.md`

**Step 1: Update project name and references**

- Change title to "OpenShift BareMetal Insights"
- Update all `redfish-insights` → `baremetal-insights`
- Update all `openshift-redfish-insights` → `openshift-baremetal-insights`
- Update image references
- Update Helm commands

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for BareMetal Insights rename"
```

---

### Task 11: Update Documentation Files

**Files:**
- Modify: All files in `docs/plans/*.md`

**Step 1: Update documentation references**

Run:
```bash
cd docs/plans
sed -i '' 's/redfish-insights/baremetal-insights/g' *.md
sed -i '' 's/openshift-redfish-insights/openshift-baremetal-insights/g' *.md
sed -i '' 's/Redfish Insights/BareMetal Insights/g' *.md
```

**Step 2: Commit**

```bash
git add docs/
git commit -m "docs: update plan documents for BareMetal Insights rename"
```

---

### Task 12: Update Console Plugin Deploy Manifests

**Files:**
- Modify: `console-plugin/deploy/deployment.yaml`
- Modify: `console-plugin/deploy/service.yaml`
- Modify: `console-plugin/deploy/consoleplugin.yaml`

**Step 1: Update deploy manifests**

Run:
```bash
cd console-plugin/deploy
sed -i '' 's/redfish-insights/baremetal-insights/g' *.yaml
sed -i '' 's/openshift-redfish-insights/openshift-baremetal-insights/g' *.yaml
```

**Step 2: Commit**

```bash
git add console-plugin/deploy/
git commit -m "refactor: update console plugin deploy manifests"
```

---

### Task 13: Final Verification

**Step 1: Verify Go build and tests**

Run:
```bash
go build ./...
go test ./...
```
Expected: All pass

**Step 2: Verify plugin build**

Run:
```bash
cd console-plugin && npm run build
```
Expected: Build succeeds

**Step 3: Verify Helm lint**

Run:
```bash
helm lint helm/openshift-baremetal-insights
```
Expected: No errors

**Step 4: Search for any remaining references**

Run:
```bash
grep -r "redfish-insights" --include="*.go" --include="*.yaml" --include="*.json" --include="*.tsx" --include="*.ts" --include="Makefile" . | grep -v node_modules | grep -v "internal/redfish"
```
Expected: No results (except possibly docs referencing the old name historically)

**Step 5: Final commit (if any stragglers)**

```bash
git add -A
git status
# If changes exist:
git commit -m "refactor: fix remaining baremetal-insights references"
```

---

### Task 14: Update CLAUDE.md (if exists)

**Files:**
- Modify: `CLAUDE.md` (if present)

**Step 1: Check if CLAUDE.md exists and update**

Run:
```bash
if [ -f CLAUDE.md ]; then
  sed -i '' 's/redfish-insights/baremetal-insights/g' CLAUDE.md
  sed -i '' 's/openshift-redfish-insights/openshift-baremetal-insights/g' CLAUDE.md
  git add CLAUDE.md
  git commit -m "docs: update CLAUDE.md for BareMetal Insights"
fi
```

---

## Post-Implementation: Manual Steps

After code changes are complete and merged:

1. **Rename GitHub repo** (in GitHub Settings → General)
   - `openshift-redfish-insights` → `openshift-baremetal-insights`

2. **Update local git remote**
   ```bash
   git remote set-url origin https://github.com/cragr/openshift-baremetal-insights.git
   ```

3. **Create Quay.io repositories**
   - `quay.io/cragr/openshift-baremetal-insights`
   - `quay.io/cragr/openshift-baremetal-insights-plugin`

4. **Build and push new images**
   ```bash
   make docker-build docker-push
   make plugin-build plugin-push
   ```

5. **Deploy to cluster**
   ```bash
   # Uninstall old release
   helm uninstall redfish-insights -n redfish-insights
   kubectl delete namespace redfish-insights

   # Install new release
   helm install baremetal-insights helm/openshift-baremetal-insights -n baremetal-insights --create-namespace
   ```
