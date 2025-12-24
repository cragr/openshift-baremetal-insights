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