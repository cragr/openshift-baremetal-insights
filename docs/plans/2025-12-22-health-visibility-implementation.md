# Health Visibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add hardware health visibility (thermal, power, events) to the Redfish Insights console plugin.

**Architecture:** Extend existing backend to collect health data via Redfish API and expose new endpoints. Restructure frontend with new Overview/Nodes/Events pages and tabbed Node Detail view.

**Tech Stack:** Go 1.21+, gofish Redfish library, React 18, PatternFly 6, TypeScript

---

## Task 1: Add Health Types to Backend Models

**Files:**
- Modify: `internal/models/types.go`
- Test: `internal/models/types_test.go`

**Step 1: Write the failing test**

Add to `internal/models/types_test.go`:

```go
func TestHealthStatus_String(t *testing.T) {
	tests := []struct {
		status HealthStatus
		want   string
	}{
		{HealthOK, "OK"},
		{HealthWarning, "Warning"},
		{HealthCritical, "Critical"},
	}
	for _, tt := range tests {
		if got := string(tt.status); got != tt.want {
			t.Errorf("HealthStatus = %v, want %v", got, tt.want)
		}
	}
}

func TestComponentHealth_IsHealthy(t *testing.T) {
	healthy := ComponentHealth{Status: HealthOK}
	unhealthy := ComponentHealth{Status: HealthCritical}

	if !healthy.IsHealthy() {
		t.Error("expected healthy component to return true")
	}
	if unhealthy.IsHealthy() {
		t.Error("expected unhealthy component to return false")
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/models/... -v -run TestHealthStatus`
Expected: FAIL with "undefined: HealthStatus"

**Step 3: Write implementation**

Add to `internal/models/types.go`:

```go
// HealthStatus represents component health state
type HealthStatus string

const (
	HealthOK       HealthStatus = "OK"
	HealthWarning  HealthStatus = "Warning"
	HealthCritical HealthStatus = "Critical"
	HealthUnknown  HealthStatus = "Unknown"
)

// ComponentHealth represents health of a single component type
type ComponentHealth struct {
	Name    string       `json:"name"`
	Status  HealthStatus `json:"status"`
	Details string       `json:"details,omitempty"`
}

// IsHealthy returns true if status is OK
func (c *ComponentHealth) IsHealthy() bool {
	return c.Status == HealthOK
}

// HealthRollup aggregates health across component types
type HealthRollup struct {
	Processors    HealthStatus `json:"processors"`
	Memory        HealthStatus `json:"memory"`
	PowerSupplies HealthStatus `json:"powerSupplies"`
	Fans          HealthStatus `json:"fans"`
	Storage       HealthStatus `json:"storage"`
	Network       HealthStatus `json:"network"`
}

// ThermalSummary holds temperature and fan data
type ThermalSummary struct {
	InletTempC  int          `json:"inletTempC"`
	MaxTempC    int          `json:"maxTempC"`
	FanCount    int          `json:"fanCount"`
	FansHealthy int          `json:"fansHealthy"`
	Status      HealthStatus `json:"status"`
}

// PowerSummary holds power consumption and PSU data
type PowerSummary struct {
	CurrentWatts int          `json:"currentWatts"`
	PSUCount     int          `json:"psuCount"`
	PSUsHealthy  int          `json:"psusHealthy"`
	Redundancy   string       `json:"redundancy"`
	Status       HealthStatus `json:"status"`
}

// ThermalReading represents a single temperature sensor
type ThermalReading struct {
	Name    string       `json:"name"`
	TempC   int          `json:"tempC"`
	Status  HealthStatus `json:"status"`
}

// FanReading represents a single fan
type FanReading struct {
	Name   string       `json:"name"`
	RPM    int          `json:"rpm"`
	Status HealthStatus `json:"status"`
}

// ThermalDetail provides full thermal information for a node
type ThermalDetail struct {
	Temperatures []ThermalReading `json:"temperatures"`
	Fans         []FanReading     `json:"fans"`
}

// PSUReading represents a single power supply unit
type PSUReading struct {
	Name       string       `json:"name"`
	Status     HealthStatus `json:"status"`
	CapacityW  int          `json:"capacityW"`
}

// PowerDetail provides full power information for a node
type PowerDetail struct {
	CurrentWatts int          `json:"currentWatts"`
	PSUs         []PSUReading `json:"psus"`
	Redundancy   string       `json:"redundancy"`
}

// HealthEvent represents a system event log entry
type HealthEvent struct {
	ID        string       `json:"id"`
	Timestamp time.Time    `json:"timestamp"`
	Severity  HealthStatus `json:"severity"`
	Message   string       `json:"message"`
	NodeName  string       `json:"nodeName,omitempty"`
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/types.go internal/models/types_test.go
git commit -m "feat(models): add health, thermal, power, and event types"
```

---

## Task 2: Extend Node Model with Health Fields

**Files:**
- Modify: `internal/models/types.go`

**Step 1: Update Node struct**

In `internal/models/types.go`, update the `Node` struct:

```go
// Node represents a discovered bare metal server
type Node struct {
	Name             string              `json:"name"`
	Namespace        string              `json:"namespace"`
	BMCAddress       string              `json:"bmcAddress"`
	Model            string              `json:"model"`
	Manufacturer     string              `json:"manufacturer"`
	ServiceTag       string              `json:"serviceTag"`
	LastScanned      time.Time           `json:"lastScanned"`
	Status           NodeStatus          `json:"status"`
	FirmwareCount    int                 `json:"firmwareCount"`
	UpdatesAvailable int                 `json:"updatesAvailable"`
	Firmware         []FirmwareComponent `json:"firmware,omitempty"`
	// Health fields
	Health           HealthStatus        `json:"health"`
	HealthRollup     *HealthRollup       `json:"healthRollup,omitempty"`
	ThermalSummary   *ThermalSummary     `json:"thermalSummary,omitempty"`
	PowerSummary     *PowerSummary       `json:"powerSummary,omitempty"`
}
```

**Step 2: Run existing tests**

Run: `go test ./... -v`
Expected: PASS (no breaking changes)

**Step 3: Commit**

```bash
git add internal/models/types.go
git commit -m "feat(models): extend Node with health, thermal, power fields"
```

---

## Task 3: Add Health Data Collection to Redfish Client

**Files:**
- Modify: `internal/redfish/client.go`
- Test: `internal/redfish/client_test.go`

**Step 1: Write the failing test**

Add to `internal/redfish/client_test.go`:

```go
func TestParseHealthStatus(t *testing.T) {
	tests := []struct {
		input string
		want  models.HealthStatus
	}{
		{"OK", models.HealthOK},
		{"Warning", models.HealthWarning},
		{"Critical", models.HealthCritical},
		{"", models.HealthUnknown},
		{"Unknown", models.HealthUnknown},
	}
	for _, tt := range tests {
		got := parseHealthStatus(tt.input)
		if got != tt.want {
			t.Errorf("parseHealthStatus(%q) = %v, want %v", tt.input, got, tt.want)
		}
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/redfish/... -v -run TestParseHealthStatus`
Expected: FAIL with "undefined: parseHealthStatus"

**Step 3: Write implementation**

Add to `internal/redfish/client.go`:

```go
func parseHealthStatus(s string) models.HealthStatus {
	switch s {
	case "OK":
		return models.HealthOK
	case "Warning":
		return models.HealthWarning
	case "Critical":
		return models.HealthCritical
	default:
		return models.HealthUnknown
	}
}

// GetSystemHealth fetches health rollup from Redfish Systems endpoint
func (c *Client) GetSystemHealth(ctx context.Context, bmcAddress, username, password string) (*models.HealthRollup, models.HealthStatus, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, models.HealthUnknown, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, models.HealthUnknown, fmt.Errorf("failed to get systems: %w", err)
	}

	if len(systems) == 0 {
		return nil, models.HealthUnknown, fmt.Errorf("no systems found")
	}

	sys := systems[0]
	overallHealth := parseHealthStatus(string(sys.Status.Health))

	rollup := &models.HealthRollup{
		Processors:    models.HealthUnknown,
		Memory:        models.HealthUnknown,
		PowerSupplies: models.HealthUnknown,
		Fans:          models.HealthUnknown,
		Storage:       models.HealthUnknown,
		Network:       models.HealthUnknown,
	}

	// Get processor health
	procs, err := sys.Processors()
	if err == nil {
		rollup.Processors = aggregateHealth(procs)
	}

	// Get memory health
	memory, err := sys.Memory()
	if err == nil {
		rollup.Memory = aggregateMemoryHealth(memory)
	}

	return rollup, overallHealth, nil
}

func aggregateHealth[T interface{ GetHealth() string }](items []T) models.HealthStatus {
	worst := models.HealthOK
	for _, item := range items {
		h := parseHealthStatus(item.GetHealth())
		if h == models.HealthCritical {
			return models.HealthCritical
		}
		if h == models.HealthWarning {
			worst = models.HealthWarning
		}
	}
	return worst
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/redfish/... -v -run TestParseHealthStatus`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/redfish/client.go internal/redfish/client_test.go
git commit -m "feat(redfish): add health data collection"
```

---

## Task 4: Add Thermal Data Collection

**Files:**
- Modify: `internal/redfish/client.go`
- Test: `internal/redfish/client_test.go`

**Step 1: Write implementation**

Add to `internal/redfish/client.go`:

```go
// GetThermalData fetches temperature and fan data from Redfish Chassis
func (c *Client) GetThermalData(ctx context.Context, bmcAddress, username, password string) (*models.ThermalDetail, *models.ThermalSummary, error) {
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

	service := client.GetService()
	chassis, err := service.Chassis()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get chassis: %w", err)
	}

	if len(chassis) == 0 {
		return nil, nil, fmt.Errorf("no chassis found")
	}

	thermal, err := chassis[0].Thermal()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get thermal: %w", err)
	}

	detail := &models.ThermalDetail{
		Temperatures: make([]models.ThermalReading, 0),
		Fans:         make([]models.FanReading, 0),
	}

	var maxTemp, inletTemp int
	for _, t := range thermal.Temperatures {
		reading := models.ThermalReading{
			Name:   t.Name,
			TempC:  int(t.ReadingCelsius),
			Status: parseHealthStatus(string(t.Status.Health)),
		}
		detail.Temperatures = append(detail.Temperatures, reading)

		if t.ReadingCelsius > float64(maxTemp) {
			maxTemp = int(t.ReadingCelsius)
		}
		if contains(t.Name, "Inlet", "Ambient") {
			inletTemp = int(t.ReadingCelsius)
		}
	}

	fansHealthy := 0
	for _, f := range thermal.Fans {
		status := parseHealthStatus(string(f.Status.Health))
		reading := models.FanReading{
			Name:   f.Name,
			RPM:    int(f.Reading),
			Status: status,
		}
		detail.Fans = append(detail.Fans, reading)
		if status == models.HealthOK {
			fansHealthy++
		}
	}

	summary := &models.ThermalSummary{
		InletTempC:  inletTemp,
		MaxTempC:    maxTemp,
		FanCount:    len(thermal.Fans),
		FansHealthy: fansHealthy,
		Status:      models.HealthOK,
	}

	if fansHealthy < len(thermal.Fans) {
		summary.Status = models.HealthWarning
	}

	return detail, summary, nil
}
```

**Step 2: Run existing tests**

Run: `go test ./internal/redfish/... -v`
Expected: PASS

**Step 3: Commit**

```bash
git add internal/redfish/client.go
git commit -m "feat(redfish): add thermal data collection"
```

---

## Task 5: Add Power Data Collection

**Files:**
- Modify: `internal/redfish/client.go`

**Step 1: Write implementation**

Add to `internal/redfish/client.go`:

```go
// GetPowerData fetches power supply and consumption data from Redfish Chassis
func (c *Client) GetPowerData(ctx context.Context, bmcAddress, username, password string) (*models.PowerDetail, *models.PowerSummary, error) {
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

	service := client.GetService()
	chassis, err := service.Chassis()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get chassis: %w", err)
	}

	if len(chassis) == 0 {
		return nil, nil, fmt.Errorf("no chassis found")
	}

	power, err := chassis[0].Power()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get power: %w", err)
	}

	detail := &models.PowerDetail{
		PSUs: make([]models.PSUReading, 0),
	}

	// Get current power consumption
	if len(power.PowerControl) > 0 {
		detail.CurrentWatts = int(power.PowerControl[0].PowerConsumedWatts)
	}

	psusHealthy := 0
	for _, psu := range power.PowerSupplies {
		status := parseHealthStatus(string(psu.Status.Health))
		reading := models.PSUReading{
			Name:      psu.Name,
			Status:    status,
			CapacityW: int(psu.PowerCapacityWatts),
		}
		detail.PSUs = append(detail.PSUs, reading)
		if status == models.HealthOK {
			psusHealthy++
		}
	}

	redundancy := "Full"
	if psusHealthy < len(power.PowerSupplies) {
		redundancy = "Lost"
	}
	detail.Redundancy = redundancy

	summary := &models.PowerSummary{
		CurrentWatts: detail.CurrentWatts,
		PSUCount:     len(power.PowerSupplies),
		PSUsHealthy:  psusHealthy,
		Redundancy:   redundancy,
		Status:       models.HealthOK,
	}

	if psusHealthy < len(power.PowerSupplies) {
		summary.Status = models.HealthCritical
	}

	return detail, summary, nil
}
```

**Step 2: Run existing tests**

Run: `go test ./internal/redfish/... -v`
Expected: PASS

**Step 3: Commit**

```bash
git add internal/redfish/client.go
git commit -m "feat(redfish): add power data collection"
```

---

## Task 6: Add Event Log Collection

**Files:**
- Modify: `internal/redfish/client.go`

**Step 1: Write implementation**

Add to `internal/redfish/client.go`:

```go
// GetEvents fetches System Event Log entries from Redfish Manager
func (c *Client) GetEvents(ctx context.Context, bmcAddress, username, password string, limit int) ([]models.HealthEvent, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	managers, err := service.Managers()
	if err != nil {
		return nil, fmt.Errorf("failed to get managers: %w", err)
	}

	if len(managers) == 0 {
		return nil, fmt.Errorf("no managers found")
	}

	logServices, err := managers[0].LogServices()
	if err != nil {
		return nil, fmt.Errorf("failed to get log services: %w", err)
	}

	events := make([]models.HealthEvent, 0)

	for _, ls := range logServices {
		if ls.ID != "Sel" && ls.ID != "SEL" {
			continue
		}

		entries, err := ls.Entries()
		if err != nil {
			continue
		}

		for i, entry := range entries {
			if limit > 0 && i >= limit {
				break
			}

			severity := models.HealthOK
			switch entry.Severity {
			case "Critical":
				severity = models.HealthCritical
			case "Warning":
				severity = models.HealthWarning
			}

			events = append(events, models.HealthEvent{
				ID:        entry.ID,
				Timestamp: entry.Created,
				Severity:  severity,
				Message:   entry.Message,
			})
		}
	}

	return events, nil
}
```

**Step 2: Run existing tests**

Run: `go test ./internal/redfish/... -v`
Expected: PASS

**Step 3: Commit**

```bash
git add internal/redfish/client.go
git commit -m "feat(redfish): add event log collection"
```

---

## Task 7: Create Event Store

**Files:**
- Create: `internal/store/events.go`
- Create: `internal/store/events_test.go`

**Step 1: Write the failing test**

Create `internal/store/events_test.go`:

```go
package store

import (
	"testing"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

func TestEventStore_AddAndList(t *testing.T) {
	s := NewEventStore(100)

	event := models.HealthEvent{
		ID:        "1",
		Timestamp: time.Now(),
		Severity:  models.HealthCritical,
		Message:   "PSU failed",
		NodeName:  "worker-0",
	}

	s.AddEvent(event)
	events := s.ListEvents(10, "")

	if len(events) != 1 {
		t.Errorf("expected 1 event, got %d", len(events))
	}
	if events[0].Message != "PSU failed" {
		t.Errorf("expected message 'PSU failed', got %s", events[0].Message)
	}
}

func TestEventStore_FilterByNode(t *testing.T) {
	s := NewEventStore(100)

	s.AddEvent(models.HealthEvent{ID: "1", NodeName: "worker-0", Message: "Event 1"})
	s.AddEvent(models.HealthEvent{ID: "2", NodeName: "worker-1", Message: "Event 2"})
	s.AddEvent(models.HealthEvent{ID: "3", NodeName: "worker-0", Message: "Event 3"})

	events := s.ListEvents(10, "worker-0")

	if len(events) != 2 {
		t.Errorf("expected 2 events for worker-0, got %d", len(events))
	}
}

func TestEventStore_MaxSize(t *testing.T) {
	s := NewEventStore(2)

	s.AddEvent(models.HealthEvent{ID: "1", Message: "First"})
	s.AddEvent(models.HealthEvent{ID: "2", Message: "Second"})
	s.AddEvent(models.HealthEvent{ID: "3", Message: "Third"})

	events := s.ListEvents(10, "")

	if len(events) != 2 {
		t.Errorf("expected 2 events (max size), got %d", len(events))
	}
	// Oldest should be dropped
	for _, e := range events {
		if e.Message == "First" {
			t.Error("oldest event should have been dropped")
		}
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/store/... -v -run TestEventStore`
Expected: FAIL with "undefined: NewEventStore"

**Step 3: Write implementation**

Create `internal/store/events.go`:

```go
package store

import (
	"sort"
	"sync"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// EventStore provides thread-safe storage for health events
type EventStore struct {
	mu      sync.RWMutex
	events  []models.HealthEvent
	maxSize int
}

// NewEventStore creates a new EventStore with max capacity
func NewEventStore(maxSize int) *EventStore {
	return &EventStore{
		events:  make([]models.HealthEvent, 0),
		maxSize: maxSize,
	}
}

// AddEvent adds an event to the store
func (s *EventStore) AddEvent(event models.HealthEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append(s.events, event)

	// Trim to max size, keeping newest
	if len(s.events) > s.maxSize {
		s.events = s.events[len(s.events)-s.maxSize:]
	}
}

// AddEvents adds multiple events to the store
func (s *EventStore) AddEvents(nodeName string, events []models.HealthEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, e := range events {
		e.NodeName = nodeName
		s.events = append(s.events, e)
	}

	// Trim to max size
	if len(s.events) > s.maxSize {
		s.events = s.events[len(s.events)-s.maxSize:]
	}
}

// ListEvents returns events, optionally filtered by node
func (s *EventStore) ListEvents(limit int, nodeName string) []models.HealthEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.HealthEvent, 0)

	for _, e := range s.events {
		if nodeName != "" && e.NodeName != nodeName {
			continue
		}
		result = append(result, e)
	}

	// Sort by timestamp descending (newest first)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Timestamp.After(result[j].Timestamp)
	})

	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}

	return result
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/store/... -v -run TestEventStore`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/store/events.go internal/store/events_test.go
git commit -m "feat(store): add event store for health events"
```

---

## Task 8: Add Health API Endpoints

**Files:**
- Modify: `internal/api/server.go`
- Modify: `internal/api/handlers.go`
- Test: `internal/api/handlers_test.go`

**Step 1: Write the failing test**

Add to `internal/api/handlers_test.go`:

```go
func TestGetNodeHealthHandler(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:   "worker-0",
		Health: models.HealthOK,
		HealthRollup: &models.HealthRollup{
			Processors:    models.HealthOK,
			Memory:        models.HealthOK,
			PowerSupplies: models.HealthOK,
			Fans:          models.HealthOK,
			Storage:       models.HealthOK,
			Network:       models.HealthOK,
		},
	})

	es := store.NewEventStore(100)
	srv := NewServerWithEvents(s, es, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes/worker-0/health", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response struct {
		Health       string `json:"health"`
		HealthRollup struct {
			Processors string `json:"processors"`
		} `json:"healthRollup"`
	}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response.Health != "OK" {
		t.Errorf("expected health OK, got %s", response.Health)
	}
}

func TestListEventsHandler(t *testing.T) {
	s := store.New()
	es := store.NewEventStore(100)
	es.AddEvent(models.HealthEvent{
		ID:       "1",
		Severity: models.HealthCritical,
		Message:  "Test event",
		NodeName: "worker-0",
	})

	srv := NewServerWithEvents(s, es, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/events", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response struct {
		Events []models.HealthEvent `json:"events"`
	}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Events) != 1 {
		t.Errorf("expected 1 event, got %d", len(response.Events))
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/api/... -v -run TestGetNodeHealthHandler`
Expected: FAIL with "undefined: NewServerWithEvents"

**Step 3: Update server.go**

Modify `internal/api/server.go`:

```go
// Server is the REST API server
type Server struct {
	store      *store.Store
	eventStore *store.EventStore
	router     *chi.Mux
	addr       string
	server     *http.Server
	certFile   string
	keyFile    string
}

// NewServer creates a new API server (backwards compatible)
func NewServer(s *store.Store, addr, certFile, keyFile string) *Server {
	return NewServerWithEvents(s, nil, addr, certFile, keyFile)
}

// NewServerWithEvents creates a new API server with event store
func NewServerWithEvents(s *store.Store, es *store.EventStore, addr, certFile, keyFile string) *Server {
	srv := &Server{
		store:      s,
		eventStore: es,
		addr:       addr,
		certFile:   certFile,
		keyFile:    keyFile,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*"},
		AllowedMethods:   []string{"GET", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/nodes", srv.listNodes)
		r.Get("/nodes/{name}/firmware", srv.getNodeFirmware)
		r.Get("/nodes/{name}/health", srv.getNodeHealth)
		r.Get("/nodes/{name}/thermal", srv.getNodeThermal)
		r.Get("/nodes/{name}/power", srv.getNodePower)
		r.Get("/nodes/{name}/events", srv.getNodeEvents)
		r.Get("/updates", srv.listUpdates)
		r.Get("/events", srv.listEvents)
		r.Get("/health", srv.health)
	})

	r.Handle("/metrics", promhttp.Handler())
	r.HandleFunc("/healthz", healthzHandler)

	srv.router = r
	return srv
}
```

**Step 4: Add handlers**

Add to `internal/api/handlers.go`:

```go
func (s *Server) getNodeHealth(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	response := map[string]interface{}{
		"health":       node.Health,
		"healthRollup": node.HealthRollup,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodeThermal(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	// For now, return summary. Full detail would require live Redfish call or cached detail.
	response := map[string]interface{}{
		"thermal": node.ThermalSummary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodePower(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	response := map[string]interface{}{
		"power": node.PowerSummary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodeEvents(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	if s.eventStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"events": []interface{}{}})
		return
	}

	events := s.eventStore.ListEvents(50, name)

	response := map[string]interface{}{
		"events": events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) listEvents(w http.ResponseWriter, r *http.Request) {
	if s.eventStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"events": []interface{}{}})
		return
	}

	// Parse query params
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	nodeName := r.URL.Query().Get("node")

	events := s.eventStore.ListEvents(limit, nodeName)

	response := map[string]interface{}{
		"events": events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
```

Add import for strconv at top of handlers.go:

```go
import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
)
```

**Step 5: Run test to verify it passes**

Run: `go test ./internal/api/... -v`
Expected: PASS

**Step 6: Commit**

```bash
git add internal/api/server.go internal/api/handlers.go internal/api/handlers_test.go
git commit -m "feat(api): add health, thermal, power, events endpoints"
```

---

## Task 9: Update Poller to Collect Health Data

**Files:**
- Modify: `internal/poller/poller.go`

**Step 1: Update poller to collect health data**

The poller needs to call the new Redfish methods and store health data. Update `internal/poller/poller.go` to:

1. Call `GetSystemHealth` after `GetFirmwareInventory`
2. Call `GetThermalData`
3. Call `GetPowerData`
4. Call `GetEvents`
5. Store all data on the Node struct

This is a larger change - review existing poller.go and add the calls appropriately.

**Step 2: Run tests**

Run: `go test ./internal/poller/... -v`
Expected: PASS

**Step 3: Commit**

```bash
git add internal/poller/poller.go
git commit -m "feat(poller): collect health, thermal, power data during poll"
```

---

## Task 10: Add Frontend Types

**Files:**
- Modify: `console-plugin/src/types.ts`

**Step 1: Add new types**

Update `console-plugin/src/types.ts`:

```typescript
export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';
export type HealthStatus = 'OK' | 'Warning' | 'Critical' | 'Unknown';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
}

export interface HealthRollup {
  processors: HealthStatus;
  memory: HealthStatus;
  powerSupplies: HealthStatus;
  fans: HealthStatus;
  storage: HealthStatus;
  network: HealthStatus;
}

export interface ThermalSummary {
  inletTempC: number;
  maxTempC: number;
  fanCount: number;
  fansHealthy: number;
  status: HealthStatus;
}

export interface PowerSummary {
  currentWatts: number;
  psuCount: number;
  psusHealthy: number;
  redundancy: string;
  status: HealthStatus;
}

export interface Node {
  name: string;
  namespace: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  lastScanned: string;
  status: NodeStatus;
  firmwareCount: number;
  updatesAvailable: number;
  firmware?: FirmwareComponent[];
  health: HealthStatus;
  healthRollup?: HealthRollup;
  thermalSummary?: ThermalSummary;
  powerSummary?: PowerSummary;
}

export interface HealthEvent {
  id: string;
  timestamp: string;
  severity: HealthStatus;
  message: string;
  nodeName: string;
}

export interface UpdateSummary {
  componentType: string;
  availableVersion: string;
  affectedNodes: string[];
  nodeCount: number;
}

export interface NodesResponse {
  nodes: Node[];
}

export interface UpdatesResponse {
  updates: UpdateSummary[];
}

export interface EventsResponse {
  events: HealthEvent[];
}
```

**Step 2: Run build to verify types compile**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add console-plugin/src/types.ts
git commit -m "feat(plugin): add health, thermal, power, event types"
```

---

## Task 11: Add API Client Methods

**Files:**
- Modify: `console-plugin/src/services/api.ts`

**Step 1: Add new API methods**

Update `console-plugin/src/services/api.ts`:

```typescript
import { consoleFetchJSON } from '@openshift-console/dynamic-plugin-sdk';
import {
  Node,
  NodesResponse,
  UpdatesResponse,
  FirmwareComponent,
  HealthRollup,
  ThermalSummary,
  PowerSummary,
  HealthEvent,
  EventsResponse,
} from '../types';

const API_BASE = '/api/proxy/plugin/redfish-insights-plugin/redfish-insights';

export const getNodes = async (): Promise<Node[]> => {
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/nodes`)) as NodesResponse;
  return response.nodes || [];
};

export const getNodeFirmware = async (name: string): Promise<FirmwareComponent[]> => {
  const response = (await consoleFetchJSON(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/firmware`
  )) as { firmware: FirmwareComponent[] };
  return response.firmware || [];
};

export const getNodeHealth = async (name: string): Promise<{ health: string; healthRollup: HealthRollup }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/health`);
};

export const getNodeThermal = async (name: string): Promise<{ thermal: ThermalSummary }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/thermal`);
};

export const getNodePower = async (name: string): Promise<{ power: PowerSummary }> => {
  return consoleFetchJSON(`${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/power`);
};

export const getNodeEvents = async (name: string): Promise<HealthEvent[]> => {
  const response = (await consoleFetchJSON(
    `${API_BASE}/api/v1/nodes/${encodeURIComponent(name)}/events`
  )) as EventsResponse;
  return response.events || [];
};

export const getEvents = async (limit?: number, node?: string): Promise<HealthEvent[]> => {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (node) params.set('node', node);
  const query = params.toString() ? `?${params}` : '';
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/events${query}`)) as EventsResponse;
  return response.events || [];
};

export const getUpdates = async (): Promise<UpdatesResponse> => {
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/updates`)) as UpdatesResponse;
  return { updates: response.updates || [] };
};
```

**Step 2: Run build**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add console-plugin/src/services/api.ts
git commit -m "feat(plugin): add health, thermal, power, events API methods"
```

---

## Task 12: Create HealthStatusIcon Component

**Files:**
- Create: `console-plugin/src/components/HealthStatusIcon.tsx`
- Create: `console-plugin/src/components/HealthStatusIcon.test.tsx`

**Step 1: Write the failing test**

Create `console-plugin/src/components/HealthStatusIcon.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { HealthStatusIcon } from './HealthStatusIcon';

describe('HealthStatusIcon', () => {
  it('renders OK status with green check', () => {
    render(<HealthStatusIcon status="OK" />);
    expect(screen.getByLabelText('OK')).toBeInTheDocument();
  });

  it('renders Warning status with yellow icon', () => {
    render(<HealthStatusIcon status="Warning" />);
    expect(screen.getByLabelText('Warning')).toBeInTheDocument();
  });

  it('renders Critical status with red icon', () => {
    render(<HealthStatusIcon status="Critical" />);
    expect(screen.getByLabelText('Critical')).toBeInTheDocument();
  });

  it('renders Unknown status with gray icon', () => {
    render(<HealthStatusIcon status="Unknown" />);
    expect(screen.getByLabelText('Unknown')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=HealthStatusIcon`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

Create `console-plugin/src/components/HealthStatusIcon.tsx`:

```typescript
import * as React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import { HealthStatus } from '../types';

interface HealthStatusIconProps {
  status: HealthStatus;
  showLabel?: boolean;
}

export const HealthStatusIcon: React.FC<HealthStatusIconProps> = ({ status, showLabel = false }) => {
  const getIcon = () => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon color="var(--pf-v5-global--success-color--100)" aria-label="OK" />;
      case 'Warning':
        return <ExclamationTriangleIcon color="var(--pf-v5-global--warning-color--100)" aria-label="Warning" />;
      case 'Critical':
        return <ExclamationCircleIcon color="var(--pf-v5-global--danger-color--100)" aria-label="Critical" />;
      default:
        return <QuestionCircleIcon color="var(--pf-v5-global--disabled-color--100)" aria-label="Unknown" />;
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {getIcon()}
      {showLabel && <span>{status}</span>}
    </span>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test -- --testPathPattern=HealthStatusIcon`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/components/HealthStatusIcon.tsx console-plugin/src/components/HealthStatusIcon.test.tsx
git commit -m "feat(plugin): add HealthStatusIcon component"
```

---

## Task 13: Create Overview Page

**Files:**
- Create: `console-plugin/src/pages/Overview.tsx`
- Create: `console-plugin/src/pages/Overview.test.tsx`

**Step 1: Write the failing test**

Create `console-plugin/src/pages/Overview.test.tsx`:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Overview } from './Overview';
import * as api from '../services/api';
import { Node, HealthEvent } from '../types';

jest.mock('../services/api');

const mockNodes: Node[] = [
  {
    name: 'worker-0',
    namespace: 'default',
    bmcAddress: '10.0.0.1',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC123',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'up-to-date',
    firmwareCount: 5,
    updatesAvailable: 0,
    health: 'OK',
  },
  {
    name: 'worker-1',
    namespace: 'default',
    bmcAddress: '10.0.0.2',
    model: 'PowerEdge R640',
    manufacturer: 'Dell',
    serviceTag: 'ABC124',
    lastScanned: '2025-12-21T00:00:00Z',
    status: 'needs-update',
    firmwareCount: 5,
    updatesAvailable: 2,
    health: 'Critical',
  },
];

const mockEvents: HealthEvent[] = [
  {
    id: '1',
    timestamp: '2025-12-22T14:00:00Z',
    severity: 'Critical',
    message: 'PSU 1 failed',
    nodeName: 'worker-1',
  },
];

describe('Overview', () => {
  beforeEach(() => {
    (api.getNodes as jest.Mock).mockResolvedValue(mockNodes);
    (api.getEvents as jest.Mock).mockResolvedValue(mockEvents);
  });

  it('renders title', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
    });
  });

  it('displays total node count', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Total Nodes')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('displays critical count', async () => {
    render(
      <MemoryRouter>
        <Overview />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=Overview.test`
Expected: FAIL with "Cannot find module"

**Step 3: Write implementation**

Create `console-plugin/src/pages/Overview.tsx`:

```typescript
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Gallery,
  GalleryItem,
  Spinner,
  Alert,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { Node, HealthEvent, HealthStatus } from '../types';
import { getNodes, getEvents } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';

export const Overview: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [nodesData, eventsData] = await Promise.all([
          getNodes(),
          getEvents(10),
        ]);
        setNodes(nodesData);
        setEvents(eventsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Page>
        <PageSection>
          <Spinner aria-label="Loading" />
        </PageSection>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error loading data">
            {error}
          </Alert>
        </PageSection>
      </Page>
    );
  }

  const healthyCnt = nodes.filter((n) => n.health === 'OK').length;
  const warningCnt = nodes.filter((n) => n.health === 'Warning').length;
  const criticalCnt = nodes.filter((n) => n.health === 'Critical').length;
  const firmwareUpdatesCnt = nodes.filter((n) => n.updatesAvailable > 0).length;

  const nodesNeedingAttention = nodes.filter((n) => n.health !== 'OK');

  return (
    <Page>
      <PageSection variant="light">
        <Title headingLevel="h1">Overview</Title>
      </PageSection>
      <PageSection>
        <Gallery hasGutter minWidths={{ default: '150px' }}>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>Total Nodes</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{nodes.length}</span>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>
                <HealthStatusIcon status="OK" /> Healthy
              </CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--success-color--100)' }}>
                  {healthyCnt}
                </span>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>
                <HealthStatusIcon status="Warning" /> Warning
              </CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--warning-color--100)' }}>
                  {warningCnt}
                </span>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>
                <HealthStatusIcon status="Critical" /> Critical
              </CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--pf-v5-global--danger-color--100)' }}>
                  {criticalCnt}
                </span>
              </CardBody>
            </Card>
          </GalleryItem>
          <GalleryItem>
            <Card isCompact>
              <CardTitle>Firmware Updates</CardTitle>
              <CardBody>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{firmwareUpdatesCnt} nodes</span>
              </CardBody>
            </Card>
          </GalleryItem>
        </Gallery>
      </PageSection>
      <PageSection>
        <Split hasGutter>
          <SplitItem isFilled>
            <Card>
              <CardTitle>Recent Health Events</CardTitle>
              <CardBody>
                {events.length === 0 ? (
                  <p>No recent events</p>
                ) : (
                  <Stack hasGutter>
                    {events.slice(0, 5).map((event) => (
                      <StackItem key={event.id}>
                        <Split>
                          <SplitItem>
                            <HealthStatusIcon status={event.severity} />
                          </SplitItem>
                          <SplitItem isFilled>
                            <Link to={`/redfish-insights/nodes/${event.nodeName}`}>{event.nodeName}</Link>
                            : {event.message}
                          </SplitItem>
                          <SplitItem>
                            <small>{new Date(event.timestamp).toLocaleString()}</small>
                          </SplitItem>
                        </Split>
                      </StackItem>
                    ))}
                  </Stack>
                )}
                <p style={{ marginTop: '1rem' }}>
                  <Link to="/redfish-insights/events">View All Events</Link>
                </p>
              </CardBody>
            </Card>
          </SplitItem>
          <SplitItem style={{ minWidth: '300px' }}>
            <Card>
              <CardTitle>Nodes Needing Attention</CardTitle>
              <CardBody>
                {nodesNeedingAttention.length === 0 ? (
                  <p>All nodes healthy</p>
                ) : (
                  <Stack hasGutter>
                    {nodesNeedingAttention.slice(0, 5).map((node) => (
                      <StackItem key={node.name}>
                        <Split>
                          <SplitItem isFilled>
                            <Link to={`/redfish-insights/nodes/${node.name}`}>{node.name}</Link>
                          </SplitItem>
                          <SplitItem>
                            <HealthStatusIcon status={node.health} showLabel />
                          </SplitItem>
                        </Split>
                      </StackItem>
                    ))}
                  </Stack>
                )}
                <p style={{ marginTop: '1rem' }}>
                  <Link to="/redfish-insights/nodes">View All Nodes</Link>
                </p>
              </CardBody>
            </Card>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};

export default Overview;
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test -- --testPathPattern=Overview.test`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/pages/Overview.tsx console-plugin/src/pages/Overview.test.tsx
git commit -m "feat(plugin): add Overview dashboard page"
```

---

## Task 14: Create Nodes List Page

**Files:**
- Create: `console-plugin/src/pages/Nodes.tsx`
- Create: `console-plugin/src/pages/Nodes.test.tsx`

This follows the same TDD pattern. Create a table view with columns: Name, Model, Health, Temp, Power, Last Seen. Include sorting, filtering by health status, and row click navigation.

**Step 1-5:** Follow same TDD pattern as Task 13.

**Commit:**
```bash
git add console-plugin/src/pages/Nodes.tsx console-plugin/src/pages/Nodes.test.tsx
git commit -m "feat(plugin): add Nodes list page"
```

---

## Task 15: Create Health Events Page

**Files:**
- Create: `console-plugin/src/pages/HealthEvents.tsx`
- Create: `console-plugin/src/pages/HealthEvents.test.tsx`

Create a table of events with columns: Severity, Node, Event, Timestamp. Include filtering by severity and node.

**Step 1-5:** Follow same TDD pattern.

**Commit:**
```bash
git add console-plugin/src/pages/HealthEvents.tsx console-plugin/src/pages/HealthEvents.test.tsx
git commit -m "feat(plugin): add Health Events page"
```

---

## Task 16: Create Node Detail Page with Tabs

**Files:**
- Create: `console-plugin/src/pages/NodeDetail.tsx`
- Create: `console-plugin/src/pages/NodeDetail.test.tsx`
- Create: `console-plugin/src/pages/tabs/HealthTab.tsx`
- Create: `console-plugin/src/pages/tabs/ThermalTab.tsx`
- Create: `console-plugin/src/pages/tabs/PowerTab.tsx`
- Create: `console-plugin/src/pages/tabs/FirmwareTab.tsx`
- Create: `console-plugin/src/pages/tabs/EventsTab.tsx`

Create tabbed detail page with header showing node info and tabs for each data category.

**Step 1-5:** Follow same TDD pattern for each component.

**Commit:**
```bash
git add console-plugin/src/pages/NodeDetail.tsx console-plugin/src/pages/NodeDetail.test.tsx
git add console-plugin/src/pages/tabs/HealthTab.tsx console-plugin/src/pages/tabs/ThermalTab.tsx
git add console-plugin/src/pages/tabs/PowerTab.tsx console-plugin/src/pages/tabs/FirmwareTab.tsx
git add console-plugin/src/pages/tabs/EventsTab.tsx
git commit -m "feat(plugin): add NodeDetail page with Health/Thermal/Power/Firmware/Events tabs"
```

---

## Task 17: Update Console Extensions (Navigation)

**Files:**
- Modify: `console-plugin/console-extensions.json`

**Step 1: Update navigation**

Replace `console-plugin/console-extensions.json`:

```json
[
  {
    "type": "console.navigation/section",
    "properties": {
      "id": "redfish-insights",
      "perspective": "admin",
      "name": "Redfish Insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-overview",
      "perspective": "admin",
      "section": "redfish-insights",
      "name": "Overview",
      "href": "/redfish-insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-nodes",
      "perspective": "admin",
      "section": "redfish-insights",
      "name": "Nodes",
      "href": "/redfish-insights/nodes"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "redfish-events",
      "perspective": "admin",
      "section": "redfish-insights",
      "name": "Health Events",
      "href": "/redfish-insights/events"
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/redfish-insights",
      "component": {
        "$codeRef": "Overview"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/redfish-insights/nodes",
      "component": {
        "$codeRef": "Nodes"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": false,
      "path": "/redfish-insights/nodes/:name",
      "component": {
        "$codeRef": "NodeDetail"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/redfish-insights/events",
      "component": {
        "$codeRef": "HealthEvents"
      }
    }
  }
]
```

**Step 2: Update plugin entry point**

Modify `console-plugin/src/plugin.ts` to export new components.

**Step 3: Build and verify**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add console-plugin/console-extensions.json console-plugin/src/plugin.ts
git commit -m "feat(plugin): update navigation to new Redfish Insights structure"
```

---

## Task 18: Remove Old Firmware Pages

**Files:**
- Delete: `console-plugin/src/pages/FirmwarePage.tsx`
- Delete: `console-plugin/src/pages/FirmwareOverview.tsx`
- Delete: `console-plugin/src/pages/FirmwareNodes.tsx`
- Delete: `console-plugin/src/pages/FirmwareUpdates.tsx`
- Delete: `console-plugin/src/pages/FirmwareNodeDetail.tsx`
- Delete: `console-plugin/src/pages/tabs/OverviewTab.tsx`
- Delete: `console-plugin/src/pages/tabs/NodesTab.tsx`
- Delete: `console-plugin/src/pages/tabs/UpdatesTab.tsx`
- Delete related test files

**Step 1: Remove old files**

```bash
cd console-plugin
rm src/pages/FirmwarePage.tsx
rm src/pages/FirmwareOverview.tsx src/pages/FirmwareOverview.test.tsx
rm src/pages/FirmwareNodes.tsx src/pages/FirmwareNodes.test.tsx
rm src/pages/FirmwareUpdates.tsx src/pages/FirmwareUpdates.test.tsx
rm src/pages/FirmwareNodeDetail.tsx src/pages/FirmwareNodeDetail.test.tsx
rm src/pages/tabs/OverviewTab.tsx src/pages/tabs/NodesTab.tsx src/pages/tabs/UpdatesTab.tsx
```

**Step 2: Verify build**

Run: `cd console-plugin && npm run build && npm test`
Expected: Build and tests pass

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor(plugin): remove old firmware pages, replaced by new structure"
```

---

## Task 19: Final Integration Testing

**Step 1: Run all backend tests**

```bash
go test ./... -v
```
Expected: All tests pass

**Step 2: Run all frontend tests**

```bash
cd console-plugin && npm test
```
Expected: All tests pass

**Step 3: Build containers**

```bash
make images
```
Expected: Images build successfully

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup and integration verification"
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Add health types | models/types.go |
| 2 | Extend Node model | models/types.go |
| 3 | Health data collection | redfish/client.go |
| 4 | Thermal data collection | redfish/client.go |
| 5 | Power data collection | redfish/client.go |
| 6 | Event log collection | redfish/client.go |
| 7 | Event store | store/events.go |
| 8 | Health API endpoints | api/server.go, handlers.go |
| 9 | Update poller | poller/poller.go |
| 10 | Frontend types | types.ts |
| 11 | API client methods | api.ts |
| 12 | HealthStatusIcon | components/HealthStatusIcon.tsx |
| 13 | Overview page | pages/Overview.tsx |
| 14 | Nodes page | pages/Nodes.tsx |
| 15 | Health Events page | pages/HealthEvents.tsx |
| 16 | Node Detail page | pages/NodeDetail.tsx + tabs |
| 17 | Navigation update | console-extensions.json |
| 18 | Remove old pages | delete old files |
| 19 | Integration testing | verify all |
