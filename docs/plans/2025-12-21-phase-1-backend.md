# Phase 1: Backend Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Go backend service that discovers BareMetalHost CRDs, connects to iDRACs via Redfish, and exposes firmware inventory via REST API.

**Architecture:** Kubernetes controller-style service using client-go to watch BareMetalHost resources, extract BMC credentials, poll iDRACs via Redfish API, and cache results in memory. REST API serves cached data to the console plugin.

**Tech Stack:** Go 1.21+, client-go, chi router, Redfish (gofish library), Docker

---

## Task 1: Project Scaffolding

**Files:**
- Create: `go.mod`
- Create: `cmd/server/main.go`
- Create: `Makefile`
- Create: `Dockerfile`

**Step 1: Initialize Go module**

Run:
```bash
cd /Users/crobins1/workspace/git/cragr/openshift-redfish-insights/.worktrees/phase-1-backend
go mod init github.com/cragr/openshift-redfish-insights
```

Expected: `go.mod` created

**Step 2: Create main.go entry point**

Create `cmd/server/main.go`:
```go
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	log.Println("Starting openshift-redfish-insights server...")

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down...")
}
```

**Step 3: Create Makefile**

Create `Makefile`:
```makefile
.PHONY: build run test clean

BINARY_NAME=openshift-redfish-insights
GO=go

build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/server

run: build
	./bin/$(BINARY_NAME)

test:
	$(GO) test -v ./...

clean:
	rm -rf bin/

lint:
	golangci-lint run

.DEFAULT_GOAL := build
```

**Step 4: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /openshift-redfish-insights ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /openshift-redfish-insights /openshift-redfish-insights

ENTRYPOINT ["/openshift-redfish-insights"]
```

**Step 5: Verify build works**

Run:
```bash
make build
```

Expected: Binary created at `bin/openshift-redfish-insights`

**Step 6: Commit**

```bash
git add go.mod cmd/ Makefile Dockerfile
git commit -m "feat: project scaffolding with Go module, Makefile, Dockerfile"
```

---

## Task 2: Data Models

**Files:**
- Create: `internal/models/types.go`
- Create: `internal/models/types_test.go`

**Step 1: Write test for Node model**

Create `internal/models/types_test.go`:
```go
package models

import (
	"testing"
	"time"
)

func TestNodeStatus(t *testing.T) {
	node := Node{
		Name:        "worker-0",
		BMCAddress:  "192.168.1.100",
		Model:       "PowerEdge R640",
		LastScanned: time.Now(),
		Status:      StatusUpToDate,
	}

	if node.Name != "worker-0" {
		t.Errorf("expected name worker-0, got %s", node.Name)
	}

	if node.Status != StatusUpToDate {
		t.Errorf("expected status up-to-date, got %s", node.Status)
	}
}

func TestFirmwareComponent(t *testing.T) {
	fw := FirmwareComponent{
		ID:               "BIOS",
		Name:             "BIOS",
		CurrentVersion:   "2.18.1",
		AvailableVersion: "2.19.1",
		Updateable:       true,
	}

	if !fw.NeedsUpdate() {
		t.Error("expected firmware to need update")
	}

	fw.AvailableVersion = "2.18.1"
	if fw.NeedsUpdate() {
		t.Error("expected firmware to not need update when versions match")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/models/... -v
```

Expected: FAIL - package does not exist

**Step 3: Write models implementation**

Create `internal/models/types.go`:
```go
package models

import "time"

// NodeStatus represents the firmware status of a node
type NodeStatus string

const (
	StatusUpToDate    NodeStatus = "up-to-date"
	StatusNeedsUpdate NodeStatus = "needs-update"
	StatusUnknown     NodeStatus = "unknown"
	StatusAuthFailed  NodeStatus = "auth-failed"
)

// Node represents a discovered bare metal server
type Node struct {
	Name            string             `json:"name"`
	BMCAddress      string             `json:"bmcAddress"`
	Model           string             `json:"model"`
	Manufacturer    string             `json:"manufacturer"`
	ServiceTag      string             `json:"serviceTag"`
	LastScanned     time.Time          `json:"lastScanned"`
	Status          NodeStatus         `json:"status"`
	FirmwareCount   int                `json:"firmwareCount"`
	UpdatesAvailable int               `json:"updatesAvailable"`
	Firmware        []FirmwareComponent `json:"firmware,omitempty"`
}

// FirmwareComponent represents a single firmware component on a server
type FirmwareComponent struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	CurrentVersion   string `json:"currentVersion"`
	AvailableVersion string `json:"availableVersion,omitempty"`
	Updateable       bool   `json:"updateable"`
	ComponentType    string `json:"componentType"`
}

// NeedsUpdate returns true if an update is available
func (f *FirmwareComponent) NeedsUpdate() bool {
	return f.AvailableVersion != "" && f.AvailableVersion != f.CurrentVersion
}

// BMCCredentials holds credentials for accessing a BMC
type BMCCredentials struct {
	Username string
	Password string
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
go test ./internal/models/... -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/
git commit -m "feat: add data models for Node and FirmwareComponent"
```

---

## Task 3: In-Memory Store

**Files:**
- Create: `internal/store/store.go`
- Create: `internal/store/store_test.go`

**Step 1: Write test for store**

Create `internal/store/store_test.go`:
```go
package store

import (
	"testing"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

func TestStore_SetAndGetNode(t *testing.T) {
	s := New()

	node := models.Node{
		Name:        "worker-0",
		BMCAddress:  "192.168.1.100",
		Model:       "PowerEdge R640",
		LastScanned: time.Now(),
		Status:      models.StatusUpToDate,
	}

	s.SetNode(node)

	got, ok := s.GetNode("worker-0")
	if !ok {
		t.Fatal("expected to find node")
	}

	if got.Name != node.Name {
		t.Errorf("expected name %s, got %s", node.Name, got.Name)
	}
}

func TestStore_ListNodes(t *testing.T) {
	s := New()

	s.SetNode(models.Node{Name: "worker-0"})
	s.SetNode(models.Node{Name: "worker-1"})

	nodes := s.ListNodes()
	if len(nodes) != 2 {
		t.Errorf("expected 2 nodes, got %d", len(nodes))
	}
}

func TestStore_DeleteNode(t *testing.T) {
	s := New()

	s.SetNode(models.Node{Name: "worker-0"})
	s.DeleteNode("worker-0")

	_, ok := s.GetNode("worker-0")
	if ok {
		t.Error("expected node to be deleted")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/store/... -v
```

Expected: FAIL - package does not exist

**Step 3: Write store implementation**

Create `internal/store/store.go`:
```go
package store

import (
	"sync"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// Store provides thread-safe in-memory storage for node firmware data
type Store struct {
	mu    sync.RWMutex
	nodes map[string]models.Node
}

// New creates a new Store
func New() *Store {
	return &Store{
		nodes: make(map[string]models.Node),
	}
}

// SetNode adds or updates a node in the store
func (s *Store) SetNode(node models.Node) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nodes[node.Name] = node
}

// GetNode retrieves a node by name
func (s *Store) GetNode(name string) (models.Node, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	node, ok := s.nodes[name]
	return node, ok
}

// ListNodes returns all nodes
func (s *Store) ListNodes() []models.Node {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nodes := make([]models.Node, 0, len(s.nodes))
	for _, node := range s.nodes {
		nodes = append(nodes, node)
	}
	return nodes
}

// DeleteNode removes a node from the store
func (s *Store) DeleteNode(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.nodes, name)
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
go test ./internal/store/... -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/store/
git commit -m "feat: add thread-safe in-memory store for node data"
```

---

## Task 4: REST API Server

**Files:**
- Create: `internal/api/server.go`
- Create: `internal/api/handlers.go`
- Create: `internal/api/handlers_test.go`

**Step 1: Add chi router dependency**

Run:
```bash
go get github.com/go-chi/chi/v5
```

**Step 2: Write test for handlers**

Create `internal/api/handlers_test.go`:
```go
package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
	"github.com/cragr/openshift-redfish-insights/internal/store"
)

func TestListNodesHandler(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:        "worker-0",
		BMCAddress:  "192.168.1.100",
		Model:       "PowerEdge R640",
		Status:      models.StatusUpToDate,
		LastScanned: time.Now(),
	})

	srv := NewServer(s, ":8080")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response struct {
		Nodes []models.Node `json:"nodes"`
	}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Nodes) != 1 {
		t.Errorf("expected 1 node, got %d", len(response.Nodes))
	}
}

func TestGetNodeHandler(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:   "worker-0",
		Status: models.StatusUpToDate,
		Firmware: []models.FirmwareComponent{
			{ID: "BIOS", Name: "BIOS", CurrentVersion: "2.18.1"},
		},
	})

	srv := NewServer(s, ":8080")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes/worker-0/firmware", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestGetNodeHandler_NotFound(t *testing.T) {
	s := store.New()
	srv := NewServer(s, ":8080")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes/nonexistent/firmware", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
go test ./internal/api/... -v
```

Expected: FAIL - package does not exist

**Step 4: Write server implementation**

Create `internal/api/server.go`:
```go
package api

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/cragr/openshift-redfish-insights/internal/store"
)

// Server is the REST API server
type Server struct {
	store  *store.Store
	router *chi.Mux
	addr   string
	server *http.Server
}

// NewServer creates a new API server
func NewServer(s *store.Store, addr string) *Server {
	srv := &Server{
		store: s,
		addr:  addr,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/nodes", srv.listNodes)
		r.Get("/nodes/{name}/firmware", srv.getNodeFirmware)
		r.Get("/health", srv.health)
	})

	srv.router = r
	return srv
}

// Start starts the HTTP server
func (s *Server) Start() error {
	s.server = &http.Server{
		Addr:         s.addr,
		Handler:      s.router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	log.Printf("Starting API server on %s", s.addr)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}
```

**Step 5: Write handlers implementation**

Create `internal/api/handlers.go`:
```go
package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
)

func (s *Server) listNodes(w http.ResponseWriter, r *http.Request) {
	nodes := s.store.ListNodes()

	response := map[string]interface{}{
		"nodes": nodes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodeFirmware(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		http.Error(w, "node not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(node)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

**Step 6: Run tests to verify they pass**

Run:
```bash
go test ./internal/api/... -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add internal/api/
git commit -m "feat: add REST API server with /nodes and /health endpoints"
```

---

## Task 5: Redfish Client

**Files:**
- Create: `internal/redfish/client.go`
- Create: `internal/redfish/client_test.go`

**Step 1: Add gofish dependency**

Run:
```bash
go get github.com/stmcginnis/gofish
```

**Step 2: Write test for Redfish client**

Create `internal/redfish/client_test.go`:
```go
package redfish

import (
	"testing"
)

func TestNewClient(t *testing.T) {
	client := NewClient()
	if client == nil {
		t.Fatal("expected non-nil client")
	}
}

func TestClient_ParseFirmwareInventory(t *testing.T) {
	// Test parsing of firmware inventory response structure
	client := NewClient()

	// Mock firmware data structure
	inventory := []RawFirmware{
		{
			ID:          "BIOS",
			Name:        "BIOS",
			Version:     "2.18.1",
			Updateable:  true,
			Description: "System BIOS",
		},
		{
			ID:          "iDRAC",
			Name:        "Integrated Dell Remote Access Controller",
			Version:     "6.10.00.00",
			Updateable:  true,
			Description: "iDRAC Firmware",
		},
	}

	components := client.ParseFirmwareInventory(inventory)

	if len(components) != 2 {
		t.Errorf("expected 2 components, got %d", len(components))
	}

	if components[0].CurrentVersion != "2.18.1" {
		t.Errorf("expected BIOS version 2.18.1, got %s", components[0].CurrentVersion)
	}
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
go test ./internal/redfish/... -v
```

Expected: FAIL - package does not exist

**Step 4: Write Redfish client implementation**

Create `internal/redfish/client.go`:
```go
package redfish

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"github.com/stmcginnis/gofish"
	"github.com/stmcginnis/gofish/redfish"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// RawFirmware represents raw firmware data from Redfish
type RawFirmware struct {
	ID          string
	Name        string
	Version     string
	Updateable  bool
	Description string
}

// Client wraps Redfish API operations
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new Redfish client
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // iDRACs use self-signed certs
				},
			},
		},
	}
}

// GetFirmwareInventory fetches firmware inventory from an iDRAC
func (c *Client) GetFirmwareInventory(ctx context.Context, bmcAddress, username, password string) ([]models.FirmwareComponent, *models.Node, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	// Get system info
	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get systems: %w", err)
	}

	var node *models.Node
	if len(systems) > 0 {
		sys := systems[0]
		node = &models.Node{
			Model:        sys.Model,
			Manufacturer: sys.Manufacturer,
			ServiceTag:   sys.SKU,
		}
	}

	// Get firmware inventory
	updateService, err := service.UpdateService()
	if err != nil {
		return nil, node, fmt.Errorf("failed to get update service: %w", err)
	}

	inventory, err := updateService.FirmwareInventory()
	if err != nil {
		return nil, node, fmt.Errorf("failed to get firmware inventory: %w", err)
	}

	components := c.parseFirmwareInventory(inventory)
	return components, node, nil
}

func (c *Client) parseFirmwareInventory(inventory []*redfish.SoftwareInventory) []models.FirmwareComponent {
	components := make([]models.FirmwareComponent, 0, len(inventory))

	for _, fw := range inventory {
		components = append(components, models.FirmwareComponent{
			ID:             fw.ID,
			Name:           fw.Name,
			CurrentVersion: fw.Version,
			Updateable:     fw.Updateable,
			ComponentType:  classifyComponent(fw.Name),
		})
	}

	return components
}

// ParseFirmwareInventory converts raw firmware data to models (for testing)
func (c *Client) ParseFirmwareInventory(raw []RawFirmware) []models.FirmwareComponent {
	components := make([]models.FirmwareComponent, 0, len(raw))

	for _, fw := range raw {
		components = append(components, models.FirmwareComponent{
			ID:             fw.ID,
			Name:           fw.Name,
			CurrentVersion: fw.Version,
			Updateable:     fw.Updateable,
			ComponentType:  classifyComponent(fw.Name),
		})
	}

	return components
}

func classifyComponent(name string) string {
	// Simple classification based on component name
	switch {
	case contains(name, "BIOS"):
		return "BIOS"
	case contains(name, "iDRAC", "BMC"):
		return "BMC"
	case contains(name, "NIC", "Network", "Ethernet"):
		return "NIC"
	case contains(name, "RAID", "PERC", "Storage"):
		return "Storage"
	case contains(name, "PSU", "Power"):
		return "Power"
	case contains(name, "CPLD"):
		return "CPLD"
	default:
		return "Other"
	}
}

func contains(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}
```

**Step 5: Run tests to verify they pass**

Run:
```bash
go test ./internal/redfish/... -v
```

Expected: PASS

**Step 6: Commit**

```bash
git add internal/redfish/
git commit -m "feat: add Redfish client for iDRAC firmware inventory"
```

---

## Task 6: BareMetalHost Discovery

**Files:**
- Create: `internal/discovery/baremetalhost.go`
- Create: `internal/discovery/baremetalhost_test.go`

**Step 1: Add client-go dependencies**

Run:
```bash
go get k8s.io/client-go@latest
go get k8s.io/apimachinery@latest
go get sigs.k8s.io/controller-runtime@latest
```

**Step 2: Write test for discovery**

Create `internal/discovery/baremetalhost_test.go`:
```go
package discovery

import (
	"testing"
)

func TestParseBMCAddress(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"idrac-virtualmedia://192.168.1.100/redfish/v1/Systems/System.Embedded.1", "192.168.1.100"},
		{"redfish-virtualmedia://10.0.0.50/redfish/v1/Systems/System.Embedded.1", "10.0.0.50"},
		{"ipmi://192.168.1.100", "192.168.1.100"},
		{"192.168.1.100", "192.168.1.100"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := ParseBMCAddress(tt.input)
			if result != tt.expected {
				t.Errorf("ParseBMCAddress(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestIsDellHardware(t *testing.T) {
	tests := []struct {
		manufacturer string
		expected     bool
	}{
		{"Dell Inc.", true},
		{"Dell", true},
		{"DELL", true},
		{"HP", false},
		{"Lenovo", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.manufacturer, func(t *testing.T) {
			result := IsDellHardware(tt.manufacturer)
			if result != tt.expected {
				t.Errorf("IsDellHardware(%q) = %v, want %v", tt.manufacturer, result, tt.expected)
			}
		})
	}
}
```

**Step 3: Run test to verify it fails**

Run:
```bash
go test ./internal/discovery/... -v
```

Expected: FAIL - package does not exist

**Step 4: Write discovery implementation**

Create `internal/discovery/baremetalhost.go`:
```go
package discovery

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"

	"github.com/cragr/openshift-redfish-insights/internal/models"
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
	dynamicClient dynamic.Interface
	kubeClient    kubernetes.Interface
	namespace     string
}

// NewDiscoverer creates a new BareMetalHost discoverer
func NewDiscoverer(dynamicClient dynamic.Interface, kubeClient kubernetes.Interface, namespace string) *Discoverer {
	return &Discoverer{
		dynamicClient: dynamicClient,
		kubeClient:    kubeClient,
		namespace:     namespace,
	}
}

// Discover finds all BareMetalHost resources and returns their BMC info
func (d *Discoverer) Discover(ctx context.Context) ([]DiscoveredHost, error) {
	list, err := d.dynamicClient.Resource(bmhGVR).Namespace(d.namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list BareMetalHosts: %w", err)
	}

	var hosts []DiscoveredHost

	for _, item := range list.Items {
		host, err := d.extractHostInfo(ctx, &item)
		if err != nil {
			// Log warning but continue with other hosts
			continue
		}
		hosts = append(hosts, *host)
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
```

**Step 5: Run tests to verify they pass**

Run:
```bash
go test ./internal/discovery/... -v
```

Expected: PASS

**Step 6: Commit**

```bash
git add internal/discovery/
git commit -m "feat: add BareMetalHost discovery with credential extraction"
```

---

## Task 7: Polling Service

**Files:**
- Create: `internal/poller/poller.go`
- Create: `internal/poller/poller_test.go`

**Step 1: Write test for poller**

Create `internal/poller/poller_test.go`:
```go
package poller

import (
	"testing"
	"time"
)

func TestNewPoller(t *testing.T) {
	p := New(nil, nil, nil, 30*time.Minute)
	if p == nil {
		t.Fatal("expected non-nil poller")
	}

	if p.interval != 30*time.Minute {
		t.Errorf("expected interval 30m, got %v", p.interval)
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/poller/... -v
```

Expected: FAIL - package does not exist

**Step 3: Write poller implementation**

Create `internal/poller/poller.go`:
```go
package poller

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/discovery"
	"github.com/cragr/openshift-redfish-insights/internal/models"
	"github.com/cragr/openshift-redfish-insights/internal/redfish"
	"github.com/cragr/openshift-redfish-insights/internal/store"
)

// Poller periodically polls iDRACs for firmware inventory
type Poller struct {
	discoverer *discovery.Discoverer
	redfish    *redfish.Client
	store      *store.Store
	interval   time.Duration

	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
}

// New creates a new Poller
func New(discoverer *discovery.Discoverer, redfishClient *redfish.Client, store *store.Store, interval time.Duration) *Poller {
	return &Poller{
		discoverer: discoverer,
		redfish:    redfishClient,
		store:      store,
		interval:   interval,
		stopCh:     make(chan struct{}),
	}
}

// Start begins the polling loop
func (p *Poller) Start(ctx context.Context) {
	p.mu.Lock()
	if p.running {
		p.mu.Unlock()
		return
	}
	p.running = true
	p.mu.Unlock()

	// Run immediately on start
	p.poll(ctx)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		case <-ticker.C:
			p.poll(ctx)
		}
	}
}

// Stop stops the polling loop
func (p *Poller) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.running {
		close(p.stopCh)
		p.running = false
	}
}

func (p *Poller) poll(ctx context.Context) {
	log.Println("Starting firmware poll...")

	hosts, err := p.discoverer.Discover(ctx)
	if err != nil {
		log.Printf("Discovery error: %v", err)
		return
	}

	log.Printf("Discovered %d hosts", len(hosts))

	var wg sync.WaitGroup
	for _, host := range hosts {
		wg.Add(1)
		go func(h discovery.DiscoveredHost) {
			defer wg.Done()
			p.pollHost(ctx, h)
		}(host)
	}
	wg.Wait()

	log.Println("Firmware poll complete")
}

func (p *Poller) pollHost(ctx context.Context, host discovery.DiscoveredHost) {
	log.Printf("Polling %s at %s", host.Name, host.BMCAddress)

	firmware, nodeInfo, err := p.redfish.GetFirmwareInventory(
		ctx,
		host.BMCAddress,
		host.Credentials.Username,
		host.Credentials.Password,
	)

	node := models.Node{
		Name:        host.Name,
		BMCAddress:  host.BMCAddress,
		LastScanned: time.Now(),
	}

	if err != nil {
		log.Printf("Error polling %s: %v", host.Name, err)
		node.Status = models.StatusUnknown
		p.store.SetNode(node)
		return
	}

	if nodeInfo != nil {
		node.Model = nodeInfo.Model
		node.Manufacturer = nodeInfo.Manufacturer
		node.ServiceTag = nodeInfo.ServiceTag

		// Skip non-Dell hardware
		if !discovery.IsDellHardware(node.Manufacturer) {
			log.Printf("Skipping non-Dell hardware: %s (%s)", host.Name, node.Manufacturer)
			return
		}
	}

	node.Firmware = firmware
	node.FirmwareCount = len(firmware)

	// Count updates available (will be populated when catalog is integrated)
	updatesNeeded := 0
	for _, fw := range firmware {
		if fw.NeedsUpdate() {
			updatesNeeded++
		}
	}
	node.UpdatesAvailable = updatesNeeded

	if updatesNeeded > 0 {
		node.Status = models.StatusNeedsUpdate
	} else {
		node.Status = models.StatusUpToDate
	}

	p.store.SetNode(node)
	log.Printf("Updated firmware inventory for %s: %d components", host.Name, len(firmware))
}
```

**Step 4: Run tests to verify they pass**

Run:
```bash
go test ./internal/poller/... -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/poller/
git commit -m "feat: add polling service for periodic firmware inventory updates"
```

---

## Task 8: Wire Everything Together

**Files:**
- Modify: `cmd/server/main.go`

**Step 1: Update main.go to wire all components**

Replace `cmd/server/main.go` with:
```go
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/cragr/openshift-redfish-insights/internal/api"
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
	poll := poller.New(discoverer, redfishClient, dataStore, pollInterval)
	server := api.NewServer(dataStore, addr)

	// Start poller in background
	ctx, cancel := context.WithCancel(context.Background())
	go poll.Start(ctx)

	// Start API server in background
	go func() {
		if err := server.Start(); err != nil {
			log.Printf("API server error: %v", err)
		}
	}()

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("Shutting down...")
	cancel()
	poll.Stop()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	server.Shutdown(shutdownCtx)
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
```

**Step 2: Run go mod tidy to update dependencies**

Run:
```bash
go mod tidy
```

**Step 3: Verify build still works**

Run:
```bash
make build
```

Expected: Binary builds successfully

**Step 4: Run all tests**

Run:
```bash
make test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add cmd/server/main.go go.mod go.sum
git commit -m "feat: wire all components together in main.go"
```

---

## Task 9: Final Verification

**Step 1: Run full test suite**

Run:
```bash
make test
```

Expected: All tests pass

**Step 2: Build Docker image**

Run:
```bash
docker build -t openshift-redfish-insights:dev .
```

Expected: Image builds successfully

**Step 3: Commit any remaining changes**

```bash
git status
# If any uncommitted changes:
git add .
git commit -m "chore: final cleanup for phase 1"
```

**Step 4: Review branch status**

```bash
git log --oneline
```

Expected: Clean series of commits implementing Phase 1

---

## Summary

Phase 1 implementation creates:
- Project scaffolding (Go module, Makefile, Dockerfile)
- Data models for Node and FirmwareComponent
- Thread-safe in-memory store
- REST API with /nodes, /nodes/{name}/firmware, /health endpoints
- Redfish client for iDRAC firmware inventory
- BareMetalHost discovery with credential extraction
- Polling service for periodic updates
- Main entry point wiring everything together

**Next Phase:** Catalog integration to compare installed firmware against Dell's available updates.
