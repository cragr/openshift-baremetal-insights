# Namespace Rename Design

## Overview

Rename the Kubernetes namespace from `openshift-baremetal-insights` to `baremetal-insights` because namespaces starting with "openshift" are reserved.

## Scope

**In scope:**
- Kubernetes namespace where pods run
- Helm chart default values
- Makefile deployment commands
- Documentation references

**Out of scope (unchanged):**
- Binary name (`openshift-baremetal-insights`)
- Container image names (`quay.io/cragr/openshift-baremetal-insights`)
- Helm chart directory name (`helm/openshift-baremetal-insights/`)
- Go code (project name references)

## Files to Modify

| File | Change |
|------|--------|
| `helm/openshift-baremetal-insights/values.yaml` | Default namespace: `openshift-baremetal-insights` → `baremetal-insights` |
| `Makefile` | `--namespace` flags in helm upgrade/uninstall |
| `README.md` | Installation instructions and service references |
| `docs/plans/*.md` | Design docs with namespace references |

## Changes

### helm/openshift-baremetal-insights/values.yaml

```yaml
# From:
namespace: openshift-baremetal-insights

# To:
namespace: baremetal-insights
```

### Makefile

```makefile
# From:
--namespace openshift-baremetal-insights

# To:
--namespace baremetal-insights
```

### Documentation

All references to:
- Namespace `openshift-baremetal-insights` → `baremetal-insights`
- Service DNS `*.openshift-baremetal-insights.svc` → `*.baremetal-insights.svc`

## Notes

- Helm templates use `{{ .Release.Namespace }}` so they automatically pick up the namespace from the release
- Existing deployments will need to be uninstalled from the old namespace and reinstalled in the new one
