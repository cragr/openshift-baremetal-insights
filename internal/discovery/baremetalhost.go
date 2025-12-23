package discovery

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

var bmhGVR = schema.GroupVersionResource{
	Group:    "metal3.io",
	Version:  "v1alpha1",
	Resource: "baremetalhosts",
}

// DiscoveredHost represents a discovered BareMetalHost with credentials
type DiscoveredHost struct {
	Name        string
	Namespace   string
	BMCAddress  string
	Credentials models.BMCCredentials
}

// Discoverer finds BareMetalHost resources and extracts BMC info
type Discoverer struct {
	dynamicClient     dynamic.Interface
	kubeClient        kubernetes.Interface
	namespace         string
	watchAllNamespaces bool
}

// NewDiscoverer creates a new BareMetalHost discoverer
// If namespace is empty or watchAllNamespaces is true, it will search all namespaces
func NewDiscoverer(dynamicClient dynamic.Interface, kubeClient kubernetes.Interface, namespace string, watchAllNamespaces bool) *Discoverer {
	return &Discoverer{
		dynamicClient:     dynamicClient,
		kubeClient:        kubeClient,
		namespace:         namespace,
		watchAllNamespaces: watchAllNamespaces,
	}
}

// Discover finds all BareMetalHost resources and returns their BMC info
func (d *Discoverer) Discover(ctx context.Context) ([]DiscoveredHost, error) {
	var list *unstructured.UnstructuredList
	var err error

	if d.watchAllNamespaces || d.namespace == "" {
		// Search across all namespaces
		log.Println("Discovering BareMetalHosts across all namespaces...")
		list, err = d.dynamicClient.Resource(bmhGVR).List(ctx, metav1.ListOptions{})
	} else {
		// Search in specific namespace
		log.Printf("Discovering BareMetalHosts in namespace %s...", d.namespace)
		list, err = d.dynamicClient.Resource(bmhGVR).Namespace(d.namespace).List(ctx, metav1.ListOptions{})
	}

	if err != nil {
		return nil, fmt.Errorf("failed to list BareMetalHosts: %w", err)
	}

	log.Printf("Found %d BareMetalHost resources", len(list.Items))

	var hosts []DiscoveredHost
	namespaceCount := make(map[string]int)

	for _, item := range list.Items {
		host, err := d.extractHostInfo(ctx, &item)
		if err != nil {
			log.Printf("Warning: Failed to extract host info for %s/%s: %v", item.GetNamespace(), item.GetName(), err)
			continue
		}
		hosts = append(hosts, *host)
		namespaceCount[item.GetNamespace()]++
	}

	// Log summary of discovered hosts by namespace
	if d.watchAllNamespaces || d.namespace == "" {
		for ns, count := range namespaceCount {
			log.Printf("  Namespace %s: %d hosts", ns, count)
		}
	}

	return hosts, nil
}

func (d *Discoverer) extractHostInfo(ctx context.Context, bmh *unstructured.Unstructured) (*DiscoveredHost, error) {
	name := bmh.GetName()
	namespace := bmh.GetNamespace()

	// Get BMC address
	bmcAddress, found, err := unstructured.NestedString(bmh.Object, "spec", "bmc", "address")
	if err != nil || !found {
		return nil, fmt.Errorf("BMC address not found for %s", name)
	}

	// Get credentials secret reference
	secretName, found, err := unstructured.NestedString(bmh.Object, "spec", "bmc", "credentialsName")
	if err != nil || !found {
		return nil, fmt.Errorf("credentials secret not found for %s", name)
	}

	// Fetch credentials from secret
	creds, err := d.getCredentials(ctx, namespace, secretName)
	if err != nil {
		return nil, fmt.Errorf("failed to get credentials for %s: %w", name, err)
	}

	return &DiscoveredHost{
		Name:        name,
		Namespace:   namespace,
		BMCAddress:  ParseBMCAddress(bmcAddress),
		Credentials: *creds,
	}, nil
}

func (d *Discoverer) getCredentials(ctx context.Context, namespace, secretName string) (*models.BMCCredentials, error) {
	secret, err := d.kubeClient.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return &models.BMCCredentials{
		Username: string(secret.Data["username"]),
		Password: string(secret.Data["password"]),
	}, nil
}

// ParseBMCAddress extracts the IP/hostname from various BMC address formats
func ParseBMCAddress(address string) string {
	// Handle various BMC address formats
	// e.g., idrac-virtualmedia://192.168.1.100/redfish/v1/...
	// e.g., redfish-virtualmedia://10.0.0.50/redfish/v1/...
	// e.g., ipmi://192.168.1.100

	if strings.Contains(address, "://") {
		u, err := url.Parse(address)
		if err == nil {
			return u.Hostname()
		}
	}

	// If no scheme, assume it's just an IP/hostname
	return address
}

// IsDellHardware checks if the manufacturer indicates Dell hardware
func IsDellHardware(manufacturer string) bool {
	m := strings.ToLower(manufacturer)
	return strings.Contains(m, "dell")
}
