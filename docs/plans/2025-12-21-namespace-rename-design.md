# Namespace Rename Design

## Overview

Rename the Kubernetes namespace from `openshift-redfish-insights` to `redfish-insights` because namespaces starting with "openshift" are reserved.

## Scope

**In scope:**
- Kubernetes namespace where pods run
- Helm chart default values
- Makefile deployment commands
- Documentation references

**Out of scope (unchanged):**
- Binary name (`openshift-redfish-insights`)
- Container image names (`quay.io/cragr/openshift-redfish-insights`)
- Helm chart directory name (`helm/openshift-redfish-insights/`)
- Go code (project name references)

## Files to Modify

| File | Change |
|------|--------|
| `helm/openshift-redfish-insights/values.yaml` | Default namespace: `openshift-redfish-insights` → `redfish-insights` |
| `Makefile` | `--namespace` flags in helm upgrade/uninstall |
| `README.md` | Installation instructions and service references |
| `docs/plans/*.md` | Design docs with namespace references |

## Changes

### helm/openshift-redfish-insights/values.yaml

```yaml
# From:
namespace: openshift-redfish-insights

# To:
namespace: redfish-insights
```

### Makefile

```makefile
# From:
--namespace openshift-redfish-insights

# To:
--namespace redfish-insights
```

### Documentation

All references to:
- Namespace `openshift-redfish-insights` → `redfish-insights`
- Service DNS `*.openshift-redfish-insights.svc` → `*.redfish-insights.svc`

## Notes

- Helm templates use `{{ .Release.Namespace }}` so they automatically pick up the namespace from the release
- Existing deployments will need to be uninstalled from the old namespace and reinstalled in the new one
