package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/cragr/openshift-redfish-insights/internal/api"
	"github.com/cragr/openshift-redfish-insights/internal/catalog"
	"github.com/cragr/openshift-redfish-insights/internal/discovery"
	"github.com/cragr/openshift-redfish-insights/internal/poller"
	"github.com/cragr/openshift-redfish-insights/internal/redfish"
	"github.com/cragr/openshift-redfish-insights/internal/store"
)

func main() {
	log.Println("Starting openshift-redfish-insights server...")

	// Get configuration from environment
	addr := getEnv("LISTEN_ADDR", ":8080")
	namespace := getEnv("WATCH_NAMESPACE", "openshift-machine-api")
	pollInterval := getEnvDuration("POLL_INTERVAL", 30*time.Minute)
	catalogURL := getEnv("CATALOG_URL", "https://downloads.dell.com/catalog/Catalog.xml.gz")
	catalogTTL := getEnvDuration("CATALOG_TTL", 24*time.Hour)

	// Create Kubernetes clients
	config, err := getKubeConfig()
	if err != nil {
		log.Fatalf("Failed to get kubeconfig: %v", err)
	}

	kubeClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		log.Fatalf("Failed to create dynamic client: %v", err)
	}

	// Create components
	dataStore := store.New()
	redfishClient := redfish.NewClient()
	discoverer := discovery.NewDiscoverer(dynamicClient, kubeClient, namespace)
	catalogSvc := catalog.NewService(catalogURL, catalogTTL)
	poll := poller.New(discoverer, redfishClient, dataStore, catalogSvc, pollInterval)
	server := api.NewServer(dataStore, addr)

	// Start poller in background
	ctx, cancel := context.WithCancel(context.Background())
	go poll.Start(ctx)

	// Start API server in background
	serverErr := make(chan error, 1)
	go func() {
		if err := server.Start(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// Wait for shutdown signal or server error
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(sigCh)

	log.Printf("Server ready - API: %s, Namespace: %s, Poll Interval: %v, Catalog TTL: %v", addr, namespace, pollInterval, catalogTTL)

	select {
	case err := <-serverErr:
		log.Fatalf("API server failed: %v", err)
	case <-sigCh:
	}

	log.Println("Shutting down...")
	cancel()
	poll.Stop()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("Error during server shutdown: %v", err)
	}
}

func getKubeConfig() (*rest.Config, error) {
	// Try in-cluster config first
	config, err := rest.InClusterConfig()
	if err == nil {
		return config, nil
	}

	// Fall back to kubeconfig file
	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = os.Getenv("HOME") + "/.kube/config"
	}

	return clientcmd.BuildConfigFromFlags("", kubeconfig)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		d, err := time.ParseDuration(value)
		if err == nil {
			return d
		}
	}
	return defaultValue
}
