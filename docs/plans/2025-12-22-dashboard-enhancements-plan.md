# Dashboard Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Transform the Overview page into a comprehensive Dashboard with summary strip, expandable cards, namespace filtering, and add a dedicated Firmware page.

**Architecture:** Backend-first approach with new API endpoints for dashboard stats and tasks, followed by frontend component updates. Shared components (NamespaceDropdown, RefreshCountdown) created first, then pages updated.

**Tech Stack:** Go (chi router), React/TypeScript, PatternFly v5, OpenShift Dynamic Plugin SDK

---

## Task 1: Add PowerState to Backend Models

**Files:**
- Modify: `internal/models/types.go:16-33`
- Test: `internal/models/types_test.go`

**Step 1: Write the failing test**

```go
// In internal/models/types_test.go, add:
func TestPowerState_String(t *testing.T) {
	tests := []struct {
		state PowerState
		want  string
	}{
		{PowerOn, "On"},
		{PowerOff, "Off"},
		{PowerUnknown, "Unknown"},
	}
	for _, tt := range tests {
		if got := string(tt.state); got != tt.want {
			t.Errorf("PowerState = %v, want %v", got, tt.want)
		}
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/models/... -v -run TestPowerState`
Expected: FAIL - undefined: PowerState

**Step 3: Write minimal implementation**

Add to `internal/models/types.go` after NodeStatus constants:

```go
// PowerState represents the server power state
type PowerState string

const (
	PowerOn      PowerState = "On"
	PowerOff     PowerState = "Off"
	PowerUnknown PowerState = "Unknown"
)
```

Add `PowerState` field to Node struct:

```go
type Node struct {
	Name             string              `json:"name"`
	Namespace        string              `json:"namespace"`
	BMCAddress       string              `json:"bmcAddress"`
	Model            string              `json:"model"`
	Manufacturer     string              `json:"manufacturer"`
	ServiceTag       string              `json:"serviceTag"`
	PowerState       PowerState          `json:"powerState"`  // NEW
	LastScanned      time.Time           `json:"lastScanned"`
	// ... rest unchanged
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/types.go internal/models/types_test.go
git commit -m "feat(models): add PowerState type and field to Node"
```

---

## Task 2: Add Task Model for Redfish Task Service

**Files:**
- Modify: `internal/models/types.go`
- Test: `internal/models/types_test.go`

**Step 1: Write the failing test**

```go
func TestTask_IsComplete(t *testing.T) {
	tests := []struct {
		state    TaskState
		complete bool
	}{
		{TaskPending, false},
		{TaskRunning, false},
		{TaskCompleted, true},
		{TaskFailed, true},
	}
	for _, tt := range tests {
		task := Task{TaskState: tt.state}
		if got := task.IsComplete(); got != tt.complete {
			t.Errorf("Task.IsComplete() with state %v = %v, want %v", tt.state, got, tt.complete)
		}
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/models/... -v -run TestTask_IsComplete`
Expected: FAIL - undefined: Task, TaskState

**Step 3: Write minimal implementation**

Add to `internal/models/types.go`:

```go
// TaskState represents Redfish task state
type TaskState string

const (
	TaskPending   TaskState = "Pending"
	TaskRunning   TaskState = "Running"
	TaskCompleted TaskState = "Completed"
	TaskFailed    TaskState = "Exception"
)

// Task represents a Redfish Task Service job
type Task struct {
	Node            string    `json:"node"`
	Namespace       string    `json:"namespace"`
	TaskID          string    `json:"taskId"`
	TaskType        string    `json:"taskType"`
	TaskState       TaskState `json:"taskState"`
	PercentComplete int       `json:"percentComplete"`
	StartTime       time.Time `json:"startTime"`
	Message         string    `json:"message"`
}

// IsComplete returns true if task is in a terminal state
func (t *Task) IsComplete() bool {
	return t.TaskState == TaskCompleted || t.TaskState == TaskFailed
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/types.go internal/models/types_test.go
git commit -m "feat(models): add Task type for Redfish Task Service"
```

---

## Task 3: Add DashboardStats Model

**Files:**
- Modify: `internal/models/types.go`
- Test: `internal/models/types_test.go`

**Step 1: Write the failing test**

```go
func TestDashboardStats_Struct(t *testing.T) {
	stats := DashboardStats{
		TotalNodes: 10,
		HealthSummary: HealthSummary{
			Healthy:  8,
			Warning:  1,
			Critical: 1,
		},
		PowerSummary: PowerStateSummary{
			On:  9,
			Off: 1,
		},
		UpdatesSummary: UpdatesSummary{
			Total:            5,
			Critical:         1,
			Recommended:      2,
			Optional:         2,
			NodesWithUpdates: 3,
		},
		JobsSummary: JobsSummary{
			Pending:    1,
			InProgress: 0,
			Completed:  5,
		},
	}
	if stats.TotalNodes != 10 {
		t.Errorf("TotalNodes = %d, want 10", stats.TotalNodes)
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/models/... -v -run TestDashboardStats`
Expected: FAIL - undefined: DashboardStats

**Step 3: Write minimal implementation**

Add to `internal/models/types.go`:

```go
// HealthSummary counts nodes by health status
type HealthSummary struct {
	Healthy  int `json:"healthy"`
	Warning  int `json:"warning"`
	Critical int `json:"critical"`
}

// PowerStateSummary counts nodes by power state
type PowerStateSummary struct {
	On  int `json:"on"`
	Off int `json:"off"`
}

// UpdatesSummary counts available firmware updates
type UpdatesSummary struct {
	Total            int `json:"total"`
	Critical         int `json:"critical"`
	Recommended      int `json:"recommended"`
	Optional         int `json:"optional"`
	NodesWithUpdates int `json:"nodesWithUpdates"`
}

// JobsSummary counts Redfish tasks by state
type JobsSummary struct {
	Pending    int `json:"pending"`
	InProgress int `json:"inProgress"`
	Completed  int `json:"completed"`
}

// DashboardStats aggregates all dashboard statistics
type DashboardStats struct {
	TotalNodes     int               `json:"totalNodes"`
	HealthSummary  HealthSummary     `json:"healthSummary"`
	PowerSummary   PowerStateSummary `json:"powerSummary"`
	UpdatesSummary UpdatesSummary    `json:"updatesSummary"`
	JobsSummary    JobsSummary       `json:"jobsSummary"`
	LastRefresh    time.Time         `json:"lastRefresh"`
	NextRefresh    time.Time         `json:"nextRefresh"`
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/types.go internal/models/types_test.go
git commit -m "feat(models): add DashboardStats and related summary types"
```

---

## Task 4: Add Severity Field to FirmwareComponent

**Files:**
- Modify: `internal/models/types.go:36-43`
- Test: `internal/models/types_test.go`

**Step 1: Write the failing test**

```go
func TestFirmwareComponent_Severity(t *testing.T) {
	fw := FirmwareComponent{
		ID:               "bios",
		Name:             "BIOS",
		CurrentVersion:   "1.0",
		AvailableVersion: "2.0",
		Severity:         SeverityCritical,
	}
	if fw.Severity != SeverityCritical {
		t.Errorf("Severity = %v, want Critical", fw.Severity)
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/models/... -v -run TestFirmwareComponent_Severity`
Expected: FAIL - undefined: SeverityCritical

**Step 3: Write minimal implementation**

Add to `internal/models/types.go`:

```go
// Severity represents update criticality
type Severity string

const (
	SeverityCritical    Severity = "Critical"
	SeverityRecommended Severity = "Recommended"
	SeverityOptional    Severity = "Optional"
)
```

Update FirmwareComponent struct:

```go
type FirmwareComponent struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	CurrentVersion   string   `json:"currentVersion"`
	AvailableVersion string   `json:"availableVersion,omitempty"`
	Updateable       bool     `json:"updateable"`
	ComponentType    string   `json:"componentType"`
	Severity         Severity `json:"severity,omitempty"`  // NEW
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/models/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/types.go internal/models/types_test.go
git commit -m "feat(models): add Severity type to FirmwareComponent"
```

---

## Task 5: Add Task Store

**Files:**
- Create: `internal/store/tasks.go`
- Test: `internal/store/tasks_test.go`

**Step 1: Write the failing test**

Create `internal/store/tasks_test.go`:

```go
package store

import (
	"testing"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

func TestTaskStore_SetAndGet(t *testing.T) {
	ts := NewTaskStore()
	task := models.Task{
		TaskID:    "JID_123",
		Node:      "node-1",
		TaskState: models.TaskRunning,
	}
	ts.SetTask(task)

	got, ok := ts.GetTask("JID_123")
	if !ok {
		t.Fatal("GetTask returned false, expected true")
	}
	if got.Node != "node-1" {
		t.Errorf("Node = %v, want node-1", got.Node)
	}
}

func TestTaskStore_ListTasks(t *testing.T) {
	ts := NewTaskStore()
	ts.SetTask(models.Task{TaskID: "JID_1", Node: "node-1", Namespace: "ns-a"})
	ts.SetTask(models.Task{TaskID: "JID_2", Node: "node-2", Namespace: "ns-b"})

	// All tasks
	tasks := ts.ListTasks("")
	if len(tasks) != 2 {
		t.Errorf("ListTasks() = %d tasks, want 2", len(tasks))
	}

	// Filtered by namespace
	tasks = ts.ListTasks("ns-a")
	if len(tasks) != 1 {
		t.Errorf("ListTasks(ns-a) = %d tasks, want 1", len(tasks))
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/store/... -v -run TestTaskStore`
Expected: FAIL - undefined: NewTaskStore

**Step 3: Write minimal implementation**

Create `internal/store/tasks.go`:

```go
package store

import (
	"sync"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

// TaskStore provides thread-safe storage for Redfish tasks
type TaskStore struct {
	mu    sync.RWMutex
	tasks map[string]models.Task
}

// NewTaskStore creates a new TaskStore
func NewTaskStore() *TaskStore {
	return &TaskStore{
		tasks: make(map[string]models.Task),
	}
}

// SetTask adds or updates a task
func (ts *TaskStore) SetTask(task models.Task) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.tasks[task.TaskID] = task
}

// GetTask retrieves a task by ID
func (ts *TaskStore) GetTask(id string) (models.Task, bool) {
	ts.mu.RLock()
	defer ts.mu.RUnlock()
	task, ok := ts.tasks[id]
	return task, ok
}

// ListTasks returns all tasks, optionally filtered by namespace
func (ts *TaskStore) ListTasks(namespace string) []models.Task {
	ts.mu.RLock()
	defer ts.mu.RUnlock()

	result := make([]models.Task, 0, len(ts.tasks))
	for _, task := range ts.tasks {
		if namespace == "" || task.Namespace == namespace {
			result = append(result, task)
		}
	}
	return result
}

// DeleteTask removes a task by ID
func (ts *TaskStore) DeleteTask(id string) {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	delete(ts.tasks, id)
}

// ClearCompleted removes all completed tasks
func (ts *TaskStore) ClearCompleted() {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	for id, task := range ts.tasks {
		if task.IsComplete() {
			delete(ts.tasks, id)
		}
	}
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/store/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/store/tasks.go internal/store/tasks_test.go
git commit -m "feat(store): add TaskStore for Redfish Task Service jobs"
```

---

## Task 6: Add Namespace Filter to Node Store

**Files:**
- Modify: `internal/store/store.go`
- Test: `internal/store/store_test.go`

**Step 1: Write the failing test**

Add to `internal/store/store_test.go`:

```go
func TestStore_ListNodesByNamespace(t *testing.T) {
	s := New()
	s.SetNode(models.Node{Name: "node-1", Namespace: "ns-a"})
	s.SetNode(models.Node{Name: "node-2", Namespace: "ns-b"})
	s.SetNode(models.Node{Name: "node-3", Namespace: "ns-a"})

	// All nodes
	nodes := s.ListNodesByNamespace("")
	if len(nodes) != 3 {
		t.Errorf("ListNodesByNamespace('') = %d, want 3", len(nodes))
	}

	// Filtered
	nodes = s.ListNodesByNamespace("ns-a")
	if len(nodes) != 2 {
		t.Errorf("ListNodesByNamespace('ns-a') = %d, want 2", len(nodes))
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/store/... -v -run TestStore_ListNodesByNamespace`
Expected: FAIL - undefined: ListNodesByNamespace

**Step 3: Write minimal implementation**

Add to `internal/store/store.go`:

```go
// ListNodesByNamespace returns nodes, optionally filtered by namespace
func (s *Store) ListNodesByNamespace(namespace string) []models.Node {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nodes := make([]models.Node, 0, len(s.nodes))
	for _, node := range s.nodes {
		if namespace == "" || node.Namespace == namespace {
			nodes = append(nodes, node)
		}
	}
	return nodes
}

// GetNamespaces returns unique namespaces from stored nodes
func (s *Store) GetNamespaces() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nsMap := make(map[string]bool)
	for _, node := range s.nodes {
		if node.Namespace != "" {
			nsMap[node.Namespace] = true
		}
	}

	namespaces := make([]string, 0, len(nsMap))
	for ns := range nsMap {
		namespaces = append(namespaces, ns)
	}
	return namespaces
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/store/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/store/store.go internal/store/store_test.go
git commit -m "feat(store): add namespace filtering to Store"
```

---

## Task 7: Add Dashboard API Endpoint

**Files:**
- Modify: `internal/api/server.go`
- Modify: `internal/api/handlers.go`
- Test: `internal/api/handlers_test.go`

**Step 1: Write the failing test**

Add to `internal/api/handlers_test.go`:

```go
func TestServer_Dashboard(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:      "node-1",
		Namespace: "test-ns",
		Health:    models.HealthOK,
		PowerState: models.PowerOn,
		UpdatesAvailable: 2,
	})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/dashboard", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["totalNodes"].(float64) != 1 {
		t.Errorf("totalNodes = %v, want 1", resp["totalNodes"])
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/api/... -v -run TestServer_Dashboard`
Expected: FAIL - 404 (route not found)

**Step 3: Write minimal implementation**

Add route in `internal/api/server.go` inside the `/api/v1` route block:

```go
r.Get("/dashboard", srv.dashboard)
r.Get("/namespaces", srv.listNamespaces)
```

Add handler in `internal/api/handlers.go`:

```go
func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	nodes := s.store.ListNodesByNamespace(namespace)

	stats := models.DashboardStats{
		TotalNodes:  len(nodes),
		LastRefresh: time.Now(),
		NextRefresh: time.Now().Add(30 * time.Minute), // Configurable later
	}

	// Health summary
	for _, node := range nodes {
		switch node.Health {
		case models.HealthOK:
			stats.HealthSummary.Healthy++
		case models.HealthWarning:
			stats.HealthSummary.Warning++
		case models.HealthCritical:
			stats.HealthSummary.Critical++
		}
	}

	// Power summary
	for _, node := range nodes {
		switch node.PowerState {
		case models.PowerOn:
			stats.PowerSummary.On++
		case models.PowerOff:
			stats.PowerSummary.Off++
		}
	}

	// Updates summary
	nodesWithUpdates := make(map[string]bool)
	for _, node := range nodes {
		for _, fw := range node.Firmware {
			if fw.NeedsUpdate() {
				stats.UpdatesSummary.Total++
				nodesWithUpdates[node.Name] = true
				switch fw.Severity {
				case models.SeverityCritical:
					stats.UpdatesSummary.Critical++
				case models.SeverityRecommended:
					stats.UpdatesSummary.Recommended++
				case models.SeverityOptional:
					stats.UpdatesSummary.Optional++
				}
			}
		}
	}
	stats.UpdatesSummary.NodesWithUpdates = len(nodesWithUpdates)

	// Jobs summary (placeholder - will be populated from TaskStore later)
	stats.JobsSummary = models.JobsSummary{}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (s *Server) listNamespaces(w http.ResponseWriter, r *http.Request) {
	namespaces := s.store.GetNamespaces()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"namespaces": namespaces,
	})
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/api/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/api/server.go internal/api/handlers.go internal/api/handlers_test.go
git commit -m "feat(api): add /dashboard and /namespaces endpoints"
```

---

## Task 8: Add Tasks API Endpoint

**Files:**
- Modify: `internal/api/server.go`
- Modify: `internal/api/handlers.go`
- Test: `internal/api/handlers_test.go`

**Step 1: Write the failing test**

```go
func TestServer_ListTasks(t *testing.T) {
	s := store.New()
	ts := store.NewTaskStore()
	ts.SetTask(models.Task{
		TaskID:    "JID_1",
		Node:      "node-1",
		TaskState: models.TaskRunning,
	})

	srv := NewServerWithTasks(s, nil, ts, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/tasks", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	tasks := resp["tasks"].([]interface{})
	if len(tasks) != 1 {
		t.Errorf("tasks count = %d, want 1", len(tasks))
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/api/... -v -run TestServer_ListTasks`
Expected: FAIL - undefined: NewServerWithTasks

**Step 3: Write minimal implementation**

Update `internal/api/server.go`:

```go
type Server struct {
	store      *store.Store
	eventStore *store.EventStore
	taskStore  *store.TaskStore  // NEW
	router     *chi.Mux
	addr       string
	server     *http.Server
	certFile   string
	keyFile    string
}

// NewServerWithTasks creates server with all stores
func NewServerWithTasks(s *store.Store, es *store.EventStore, ts *store.TaskStore, addr, certFile, keyFile string) *Server {
	srv := &Server{
		store:      s,
		eventStore: es,
		taskStore:  ts,
		addr:       addr,
		certFile:   certFile,
		keyFile:    keyFile,
	}
	// ... router setup with new route:
	r.Get("/tasks", srv.listTasks)
	// ...
}
```

Add handler in `internal/api/handlers.go`:

```go
func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	if s.taskStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"tasks": []interface{}{}})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	tasks := s.taskStore.ListTasks(namespace)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tasks": tasks,
	})
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/api/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/api/server.go internal/api/handlers.go internal/api/handlers_test.go
git commit -m "feat(api): add /tasks endpoint for Redfish Task Service"
```

---

## Task 9: Add Namespace Filter to Nodes Endpoint

**Files:**
- Modify: `internal/api/handlers.go`
- Test: `internal/api/handlers_test.go`

**Step 1: Write the failing test**

```go
func TestServer_ListNodes_NamespaceFilter(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{Name: "node-1", Namespace: "ns-a"})
	s.SetNode(models.Node{Name: "node-2", Namespace: "ns-b"})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/nodes?namespace=ns-a", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	nodes := resp["nodes"].([]interface{})
	if len(nodes) != 1 {
		t.Errorf("nodes count = %d, want 1", len(nodes))
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/api/... -v -run TestServer_ListNodes_NamespaceFilter`
Expected: FAIL - returns 2 nodes instead of 1

**Step 3: Write minimal implementation**

Update `listNodes` in `internal/api/handlers.go`:

```go
func (s *Server) listNodes(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	nodes := s.store.ListNodesByNamespace(namespace)

	response := map[string]interface{}{
		"nodes": nodes,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/api/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/api/handlers.go internal/api/handlers_test.go
git commit -m "feat(api): add namespace filter to /nodes endpoint"
```

---

## Task 10: Add Firmware Endpoint with Summary

**Files:**
- Modify: `internal/api/server.go`
- Modify: `internal/api/handlers.go`
- Test: `internal/api/handlers_test.go`

**Step 1: Write the failing test**

```go
func TestServer_ListFirmware(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:      "node-1",
		Namespace: "ns-a",
		Firmware: []models.FirmwareComponent{
			{ID: "bios", Name: "BIOS", CurrentVersion: "1.0", AvailableVersion: "2.0", Severity: models.SeverityCritical},
			{ID: "idrac", Name: "iDRAC", CurrentVersion: "2.0"},
		},
	})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/firmware", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	summary := resp["summary"].(map[string]interface{})
	if summary["total"].(float64) != 2 {
		t.Errorf("summary.total = %v, want 2", summary["total"])
	}
}
```

**Step 2: Run test to verify it fails**

Run: `go test ./internal/api/... -v -run TestServer_ListFirmware`
Expected: FAIL - 404 route not found

**Step 3: Write minimal implementation**

Add route in `internal/api/server.go`:

```go
r.Get("/firmware", srv.listFirmware)
```

Add handler in `internal/api/handlers.go`:

```go
// FirmwareEntry represents firmware with node context
type FirmwareEntry struct {
	Node      string                   `json:"node"`
	Namespace string                   `json:"namespace"`
	Firmware  models.FirmwareComponent `json:"firmware"`
}

func (s *Server) listFirmware(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	nodes := s.store.ListNodesByNamespace(namespace)

	var entries []FirmwareEntry
	summary := struct {
		Total            int `json:"total"`
		UpdatesAvailable int `json:"updatesAvailable"`
		Critical         int `json:"critical"`
		Recommended      int `json:"recommended"`
		Optional         int `json:"optional"`
	}{}

	for _, node := range nodes {
		for _, fw := range node.Firmware {
			entries = append(entries, FirmwareEntry{
				Node:      node.Name,
				Namespace: node.Namespace,
				Firmware:  fw,
			})
			summary.Total++
			if fw.NeedsUpdate() {
				summary.UpdatesAvailable++
				switch fw.Severity {
				case models.SeverityCritical:
					summary.Critical++
				case models.SeverityRecommended:
					summary.Recommended++
				case models.SeverityOptional:
					summary.Optional++
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"summary":  summary,
		"firmware": entries,
	})
}
```

**Step 4: Run test to verify it passes**

Run: `go test ./internal/api/... -v`
Expected: PASS

**Step 5: Commit**

```bash
git add internal/api/server.go internal/api/handlers.go internal/api/handlers_test.go
git commit -m "feat(api): add /firmware endpoint with summary"
```

---

## Task 11: Update Frontend Types

**Files:**
- Modify: `console-plugin/src/types.ts`
- Test: `console-plugin/src/types.test.ts` (create if needed)

**Step 1: Update types file**

Update `console-plugin/src/types.ts`:

```typescript
export type NodeStatus = 'up-to-date' | 'needs-update' | 'unknown' | 'auth-failed';
export type HealthStatus = 'OK' | 'Warning' | 'Critical' | 'Unknown';
export type PowerState = 'On' | 'Off' | 'Unknown';
export type Severity = 'Critical' | 'Recommended' | 'Optional';
export type TaskState = 'Pending' | 'Running' | 'Completed' | 'Exception';

export interface FirmwareComponent {
  id: string;
  name: string;
  currentVersion: string;
  availableVersion?: string;
  updateable: boolean;
  componentType: string;
  severity?: Severity;
}

// ... keep existing interfaces ...

export interface Node {
  name: string;
  namespace: string;
  bmcAddress: string;
  model: string;
  manufacturer: string;
  serviceTag: string;
  powerState: PowerState;  // NEW
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

// NEW types
export interface Task {
  node: string;
  namespace: string;
  taskId: string;
  taskType: string;
  taskState: TaskState;
  percentComplete: number;
  startTime: string;
  message: string;
}

export interface HealthSummary {
  healthy: number;
  warning: number;
  critical: number;
}

export interface PowerStateSummary {
  on: number;
  off: number;
}

export interface UpdatesSummary {
  total: number;
  critical: number;
  recommended: number;
  optional: number;
  nodesWithUpdates: number;
}

export interface JobsSummary {
  pending: number;
  inProgress: number;
  completed: number;
}

export interface DashboardStats {
  totalNodes: number;
  healthSummary: HealthSummary;
  powerSummary: PowerStateSummary;
  updatesSummary: UpdatesSummary;
  jobsSummary: JobsSummary;
  lastRefresh: string;
  nextRefresh: string;
}

export interface FirmwareEntry {
  node: string;
  namespace: string;
  firmware: FirmwareComponent;
}

export interface FirmwareResponse {
  summary: {
    total: number;
    updatesAvailable: number;
    critical: number;
    recommended: number;
    optional: number;
  };
  firmware: FirmwareEntry[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface NamespacesResponse {
  namespaces: string[];
}
```

**Step 2: Run build to verify types compile**

Run: `cd console-plugin && npm run build`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add console-plugin/src/types.ts
git commit -m "feat(frontend): add new types for dashboard, tasks, firmware"
```

---

## Task 12: Add API Functions for New Endpoints

**Files:**
- Modify: `console-plugin/src/services/api.ts`
- Test: `console-plugin/src/services/api.test.ts`

**Step 1: Write the failing test**

Add to `console-plugin/src/services/api.test.ts`:

```typescript
describe('Dashboard API', () => {
  it('fetches dashboard stats', async () => {
    const mockStats = {
      totalNodes: 10,
      healthSummary: { healthy: 8, warning: 1, critical: 1 },
      powerSummary: { on: 9, off: 1 },
      updatesSummary: { total: 5, critical: 1, recommended: 2, optional: 2, nodesWithUpdates: 3 },
      jobsSummary: { pending: 0, inProgress: 0, completed: 0 },
      lastRefresh: '2025-12-22T20:00:00Z',
      nextRefresh: '2025-12-22T20:30:00Z',
    };
    (consoleFetchJSON as jest.Mock).mockResolvedValue(mockStats);

    const result = await getDashboard();
    expect(result.totalNodes).toBe(10);
  });

  it('fetches namespaces', async () => {
    (consoleFetchJSON as jest.Mock).mockResolvedValue({ namespaces: ['ns-a', 'ns-b'] });

    const result = await getNamespaces();
    expect(result).toEqual(['ns-a', 'ns-b']);
  });

  it('fetches tasks', async () => {
    (consoleFetchJSON as jest.Mock).mockResolvedValue({ tasks: [{ taskId: 'JID_1' }] });

    const result = await getTasks();
    expect(result.length).toBe(1);
  });

  it('fetches firmware inventory', async () => {
    (consoleFetchJSON as jest.Mock).mockResolvedValue({
      summary: { total: 10, updatesAvailable: 2 },
      firmware: [],
    });

    const result = await getFirmware();
    expect(result.summary.total).toBe(10);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=api.test`
Expected: FAIL - getDashboard, getNamespaces, getTasks, getFirmware not defined

**Step 3: Write minimal implementation**

Add to `console-plugin/src/services/api.ts`:

```typescript
import {
  // ... existing imports ...
  DashboardStats,
  Task,
  TasksResponse,
  FirmwareResponse,
  NamespacesResponse,
} from '../types';

export const getDashboard = async (namespace?: string): Promise<DashboardStats> => {
  const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  return consoleFetchJSON(`${API_BASE}/api/v1/dashboard${params}`);
};

export const getNamespaces = async (): Promise<string[]> => {
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/namespaces`)) as NamespacesResponse;
  return response.namespaces || [];
};

export const getTasks = async (namespace?: string): Promise<Task[]> => {
  const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/tasks${params}`)) as TasksResponse;
  return response.tasks || [];
};

export const getFirmware = async (namespace?: string): Promise<FirmwareResponse> => {
  const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  return consoleFetchJSON(`${API_BASE}/api/v1/firmware${params}`);
};

// Update getNodes to support namespace filter
export const getNodes = async (namespace?: string): Promise<Node[]> => {
  const params = namespace ? `?namespace=${encodeURIComponent(namespace)}` : '';
  const response = (await consoleFetchJSON(`${API_BASE}/api/v1/nodes${params}`)) as NodesResponse;
  return response.nodes || [];
};
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/services/api.ts console-plugin/src/services/api.test.ts
git commit -m "feat(frontend): add API functions for dashboard, tasks, firmware, namespaces"
```

---

## Task 13: Create NamespaceDropdown Component

**Files:**
- Create: `console-plugin/src/components/NamespaceDropdown.tsx`
- Test: `console-plugin/src/components/NamespaceDropdown.test.tsx`

**Step 1: Write the failing test**

Create `console-plugin/src/components/NamespaceDropdown.test.tsx`:

```typescript
import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NamespaceDropdown } from './NamespaceDropdown';
import { getNamespaces } from '../services/api';

jest.mock('../services/api');

describe('NamespaceDropdown', () => {
  beforeEach(() => {
    (getNamespaces as jest.Mock).mockResolvedValue(['ns-a', 'ns-b']);
  });

  it('renders with All Namespaces by default', async () => {
    render(<NamespaceDropdown selected="" onSelect={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/All Namespaces/)).toBeInTheDocument();
    });
  });

  it('calls onSelect when namespace is selected', async () => {
    const onSelect = jest.fn();
    render(<NamespaceDropdown selected="" onSelect={onSelect} />);

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    fireEvent.click(screen.getByText('ns-a'));
    expect(onSelect).toHaveBeenCalledWith('ns-a');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=NamespaceDropdown`
Expected: FAIL - NamespaceDropdown not found

**Step 3: Write minimal implementation**

Create `console-plugin/src/components/NamespaceDropdown.tsx`:

```typescript
import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { getNamespaces } from '../services/api';

interface NamespaceDropdownProps {
  selected: string;
  onSelect: (namespace: string) => void;
}

export const NamespaceDropdown: React.FC<NamespaceDropdownProps> = ({ selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [namespaces, setNamespaces] = useState<string[]>([]);

  useEffect(() => {
    getNamespaces().then(setNamespaces).catch(console.error);
  }, []);

  const displayValue = selected || 'All Namespaces';

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={(_e, value) => {
        onSelect(value === 'All Namespaces' ? '' : String(value));
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle ref={toggleRef} onClick={() => setIsOpen(!isOpen)} isExpanded={isOpen}>
          {displayValue}
        </MenuToggle>
      )}
    >
      <SelectList>
        <SelectOption value="All Namespaces">All Namespaces</SelectOption>
        {namespaces.map((ns) => (
          <SelectOption key={ns} value={ns}>
            {ns}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/components/NamespaceDropdown.tsx console-plugin/src/components/NamespaceDropdown.test.tsx
git commit -m "feat(frontend): add NamespaceDropdown component"
```

---

## Task 14: Create RefreshCountdown Component

**Files:**
- Create: `console-plugin/src/components/RefreshCountdown.tsx`
- Test: `console-plugin/src/components/RefreshCountdown.test.tsx`

**Step 1: Write the failing test**

Create `console-plugin/src/components/RefreshCountdown.test.tsx`:

```typescript
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { RefreshCountdown } from './RefreshCountdown';

describe('RefreshCountdown', () => {
  it('renders countdown text', () => {
    const futureTime = new Date(Date.now() + 60000).toISOString(); // 1 minute
    render(<RefreshCountdown nextRefresh={futureTime} onRefresh={jest.fn()} />);
    expect(screen.getByText(/Refreshing in/)).toBeInTheDocument();
  });

  it('shows refresh button', () => {
    render(<RefreshCountdown nextRefresh={new Date().toISOString()} onRefresh={jest.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=RefreshCountdown`
Expected: FAIL - RefreshCountdown not found

**Step 3: Write minimal implementation**

Create `console-plugin/src/components/RefreshCountdown.tsx`:

```typescript
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button, Split, SplitItem } from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';

interface RefreshCountdownProps {
  nextRefresh: string;
  onRefresh: () => void;
}

export const RefreshCountdown: React.FC<RefreshCountdownProps> = ({ nextRefresh, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const target = new Date(nextRefresh).getTime();
      const diff = Math.max(0, target - now);

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextRefresh]);

  return (
    <Split hasGutter>
      <SplitItem>
        <span style={{ color: 'var(--pf-v5-global--Color--200)' }}>
          Refreshing in {timeLeft}
        </span>
      </SplitItem>
      <SplitItem>
        <Button variant="plain" aria-label="Refresh now" onClick={onRefresh}>
          <SyncAltIcon />
        </Button>
      </SplitItem>
    </Split>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/components/RefreshCountdown.tsx console-plugin/src/components/RefreshCountdown.test.tsx
git commit -m "feat(frontend): add RefreshCountdown component"
```

---

## Task 15: Rename Overview to Dashboard and Update Page

**Files:**
- Rename: `console-plugin/src/pages/Overview.tsx` → `console-plugin/src/pages/Dashboard.tsx`
- Modify: `console-plugin/src/pages/Dashboard.tsx`
- Rename: `console-plugin/src/pages/Overview.test.tsx` → `console-plugin/src/pages/Dashboard.test.tsx`
- Modify: `console-plugin/plugin-manifest.json`

**Step 1: Rename and update files**

Rename `Overview.tsx` to `Dashboard.tsx` and update to new design with summary strip and expandable cards.

**Step 2: Create new Dashboard implementation**

Replace content of `console-plugin/src/pages/Dashboard.tsx`:

```typescript
import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Card,
  CardTitle,
  CardBody,
  CardExpandableContent,
  Flex,
  FlexItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Label,
  Progress,
  ProgressSize,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@patternfly/react-table';
import { DashboardStats, Node, Task } from '../types';
import { getDashboard, getNodes, getTasks } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { NamespaceDropdown } from '../components/NamespaceDropdown';
import { RefreshCountdown } from '../components/RefreshCountdown';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    health: true,
    power: false,
    jobs: false,
    firmware: false,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, nodesData, tasksData] = await Promise.all([
        getDashboard(namespace || undefined),
        getNodes(namespace || undefined),
        getTasks(namespace || undefined),
      ]);
      setStats(statsData);
      setNodes(nodesData);
      setTasks(tasksData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading && !stats) {
    return (
      <Page>
        <PageSection><Spinner aria-label="Loading" /></PageSection>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">{error}</Alert>
        </PageSection>
      </Page>
    );
  }

  const nodesNeedingAttention = nodes.filter((n) => n.health !== 'OK');
  const poweredOffNodes = nodes.filter((n) => n.powerState === 'Off');

  return (
    <Page>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Dashboard</Title>
          </FlexItem>
          <FlexItem>
            <Split hasGutter>
              <SplitItem>
                <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
              </SplitItem>
              <SplitItem>
                {stats && <RefreshCountdown nextRefresh={stats.nextRefresh} onRefresh={fetchData} />}
              </SplitItem>
            </Split>
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Summary Strip */}
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>
            <strong>{stats?.totalNodes}</strong> Total Nodes
          </FlexItem>
          <FlexItem>
            <HealthStatusIcon status="OK" /> <strong>{stats?.healthSummary.healthy}</strong> Healthy
          </FlexItem>
          <FlexItem>
            <HealthStatusIcon status="Warning" /> <strong>{stats?.healthSummary.warning}</strong> Warning
          </FlexItem>
          <FlexItem>
            <HealthStatusIcon status="Critical" /> <strong>{stats?.healthSummary.critical}</strong> Critical
          </FlexItem>
          <FlexItem>
            <strong>{stats?.powerSummary.on}</strong> Powered On
          </FlexItem>
          <FlexItem>
            <strong>{stats?.powerSummary.off}</strong> Powered Off
          </FlexItem>
          <FlexItem>
            <strong>{stats?.updatesSummary.total}</strong> Updates Available
            {stats?.updatesSummary.critical ? (
              <Label color="red" isCompact style={{ marginLeft: '0.5rem' }}>
                {stats.updatesSummary.critical} critical
              </Label>
            ) : null}
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Expandable Card Sections */}
      <PageSection>
        <Stack hasGutter>
          {/* Health Overview Card */}
          <StackItem>
            <Card isExpanded={expandedCards.health}>
              <CardTitle onClick={() => toggleCard('health')} style={{ cursor: 'pointer' }}>
                Health Overview
              </CardTitle>
              <CardExpandableContent>
                <CardBody>
                  {nodesNeedingAttention.length === 0 ? (
                    <p>All nodes healthy</p>
                  ) : (
                    <Stack hasGutter>
                      {nodesNeedingAttention.map((node) => (
                        <StackItem key={node.name}>
                          <Split>
                            <SplitItem isFilled>
                              <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                            </SplitItem>
                            <SplitItem>
                              <HealthStatusIcon status={node.health} showLabel />
                            </SplitItem>
                          </Split>
                        </StackItem>
                      ))}
                    </Stack>
                  )}
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Power Status Card */}
          <StackItem>
            <Card isExpanded={expandedCards.power}>
              <CardTitle onClick={() => toggleCard('power')} style={{ cursor: 'pointer' }}>
                Power Status
              </CardTitle>
              <CardExpandableContent>
                <CardBody>
                  {poweredOffNodes.length === 0 ? (
                    <p>All nodes powered on</p>
                  ) : (
                    <Stack hasGutter>
                      {poweredOffNodes.map((node) => (
                        <StackItem key={node.name}>
                          <Link to={`/baremetal-insights/nodes/${node.name}`}>{node.name}</Link>
                          {' - Powered Off'}
                        </StackItem>
                      ))}
                    </Stack>
                  )}
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Redfish Jobs Card */}
          <StackItem>
            <Card isExpanded={expandedCards.jobs}>
              <CardTitle onClick={() => toggleCard('jobs')} style={{ cursor: 'pointer' }}>
                Redfish Jobs ({stats?.jobsSummary.pending} pending, {stats?.jobsSummary.inProgress} in progress)
              </CardTitle>
              <CardExpandableContent>
                <CardBody>
                  {tasks.length === 0 ? (
                    <p>No active jobs</p>
                  ) : (
                    <Table aria-label="Jobs table" variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Node</Th>
                          <Th>Type</Th>
                          <Th>Status</Th>
                          <Th>Progress</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {tasks.map((task) => (
                          <Tr key={task.taskId}>
                            <Td>{task.node}</Td>
                            <Td>{task.taskType}</Td>
                            <Td>{task.taskState}</Td>
                            <Td>
                              <Progress
                                value={task.percentComplete}
                                size={ProgressSize.sm}
                                aria-label={`${task.percentComplete}%`}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>

          {/* Firmware Updates Card */}
          <StackItem>
            <Card isExpanded={expandedCards.firmware}>
              <CardTitle onClick={() => toggleCard('firmware')} style={{ cursor: 'pointer' }}>
                Firmware Updates
              </CardTitle>
              <CardExpandableContent>
                <CardBody>
                  <p>
                    <strong>{stats?.updatesSummary.total}</strong> updates across{' '}
                    <strong>{stats?.updatesSummary.nodesWithUpdates}</strong> nodes
                  </p>
                  <Flex style={{ marginTop: '0.5rem' }}>
                    {stats?.updatesSummary.critical ? (
                      <FlexItem>
                        <Label color="red">{stats.updatesSummary.critical} Critical</Label>
                      </FlexItem>
                    ) : null}
                    {stats?.updatesSummary.recommended ? (
                      <FlexItem>
                        <Label color="orange">{stats.updatesSummary.recommended} Recommended</Label>
                      </FlexItem>
                    ) : null}
                    {stats?.updatesSummary.optional ? (
                      <FlexItem>
                        <Label color="blue">{stats.updatesSummary.optional} Optional</Label>
                      </FlexItem>
                    ) : null}
                  </Flex>
                  <p style={{ marginTop: '1rem' }}>
                    <Link to="/baremetal-insights/firmware">View Firmware Page</Link>
                  </p>
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>
        </Stack>
      </PageSection>
    </Page>
  );
};

export default Dashboard;
```

**Step 3: Update test file**

Rename `Overview.test.tsx` to `Dashboard.test.tsx` and update imports.

**Step 4: Update plugin-manifest.json**

```json
{
  "name": "openshift-baremetal-insights-plugin",
  "version": "0.1.0",
  "displayName": "BareMetal Insights",
  "description": "View firmware inventory and update status for bare metal nodes",
  "exposedModules": {
    "Dashboard": "./pages/Dashboard",
    "Nodes": "./pages/Nodes",
    "NodeDetail": "./pages/NodeDetail",
    "HealthEvents": "./pages/HealthEvents",
    "Firmware": "./pages/Firmware"
  },
  "dependencies": {
    "@console/pluginAPI": "*"
  }
}
```

**Step 5: Run tests**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 6: Commit**

```bash
git add -A console-plugin/src/pages/
git add console-plugin/plugin-manifest.json
git commit -m "feat(frontend): rename Overview to Dashboard with new design"
```

---

## Task 16: Create Firmware Page

**Files:**
- Create: `console-plugin/src/pages/Firmware.tsx`
- Test: `console-plugin/src/pages/Firmware.test.tsx`

**Step 1: Write the failing test**

Create `console-plugin/src/pages/Firmware.test.tsx`:

```typescript
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Firmware } from './Firmware';
import { getFirmware } from '../services/api';

jest.mock('../services/api');

describe('Firmware', () => {
  beforeEach(() => {
    (getFirmware as jest.Mock).mockResolvedValue({
      summary: { total: 2, updatesAvailable: 1, critical: 1, recommended: 0, optional: 0 },
      firmware: [
        { node: 'node-1', namespace: 'ns', firmware: { id: 'bios', name: 'BIOS', currentVersion: '1.0', availableVersion: '2.0', severity: 'Critical' } },
      ],
    });
  });

  it('renders firmware page title', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Firmware' })).toBeInTheDocument();
    });
  });

  it('shows updates summary', async () => {
    render(
      <MemoryRouter>
        <Firmware />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/1 updates available/)).toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd console-plugin && npm test -- --testPathPattern=Firmware`
Expected: FAIL - Firmware not found

**Step 3: Write minimal implementation**

Create `console-plugin/src/pages/Firmware.tsx`:

```typescript
import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import {
  Page,
  PageSection,
  Title,
  Card,
  CardTitle,
  CardBody,
  Spinner,
  Alert,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  SearchInput,
  Label,
  Flex,
  FlexItem,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ThProps,
} from '@patternfly/react-table';
import { FirmwareResponse, FirmwareEntry } from '../types';
import { getFirmware } from '../services/api';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

export const Firmware: React.FC = () => {
  const [data, setData] = useState<FirmwareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [activeSortIndex, setActiveSortIndex] = useState<number | null>(null);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getFirmware(namespace || undefined);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch firmware');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex ?? undefined,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  if (loading && !data) {
    return (
      <Page>
        <PageSection><Spinner aria-label="Loading" /></PageSection>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">{error}</Alert>
        </PageSection>
      </Page>
    );
  }

  let filteredFirmware = data?.firmware || [];
  if (searchValue) {
    const search = searchValue.toLowerCase();
    filteredFirmware = filteredFirmware.filter(
      (entry) =>
        entry.node.toLowerCase().includes(search) ||
        entry.firmware.name.toLowerCase().includes(search) ||
        entry.firmware.componentType.toLowerCase().includes(search)
    );
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'Critical': return 'red';
      case 'Recommended': return 'orange';
      case 'Optional': return 'blue';
      default: return 'grey';
    }
  };

  return (
    <Page>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Firmware</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>

      {/* Updates Summary Card */}
      <PageSection>
        <Card>
          <CardTitle>Updates Summary</CardTitle>
          <CardBody>
            <Split hasGutter>
              <SplitItem>
                <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {data?.summary.updatesAvailable}
                </span>{' '}
                updates available across {data?.summary.total} components
              </SplitItem>
              <SplitItem>
                <Flex>
                  {data?.summary.critical ? (
                    <FlexItem>
                      <Label color="red">{data.summary.critical} Critical</Label>
                    </FlexItem>
                  ) : null}
                  {data?.summary.recommended ? (
                    <FlexItem>
                      <Label color="orange">{data.summary.recommended} Recommended</Label>
                    </FlexItem>
                  ) : null}
                  {data?.summary.optional ? (
                    <FlexItem>
                      <Label color="blue">{data.summary.optional} Optional</Label>
                    </FlexItem>
                  ) : null}
                </Flex>
              </SplitItem>
            </Split>
          </CardBody>
        </Card>
      </PageSection>

      {/* Firmware Inventory Table */}
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <SearchInput
                placeholder="Search by node, component..."
                value={searchValue}
                onChange={(_e, value) => setSearchValue(value)}
                onClear={() => setSearchValue('')}
              />
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Firmware inventory">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Node</Th>
              <Th sort={getSortParams(1)}>Component</Th>
              <Th sort={getSortParams(2)}>Installed Version</Th>
              <Th sort={getSortParams(3)}>Available Version</Th>
              <Th sort={getSortParams(4)}>Severity</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredFirmware.map((entry, idx) => (
              <Tr
                key={`${entry.node}-${entry.firmware.id}-${idx}`}
                style={entry.firmware.availableVersion ? { backgroundColor: 'var(--pf-v5-global--palette--gold-50)' } : {}}
              >
                <Td dataLabel="Node">{entry.node}</Td>
                <Td dataLabel="Component">{entry.firmware.name}</Td>
                <Td dataLabel="Installed">{entry.firmware.currentVersion}</Td>
                <Td dataLabel="Available">{entry.firmware.availableVersion || '—'}</Td>
                <Td dataLabel="Severity">
                  {entry.firmware.severity ? (
                    <Label color={getSeverityColor(entry.firmware.severity)}>{entry.firmware.severity}</Label>
                  ) : (
                    '—'
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default Firmware;
```

**Step 4: Run test to verify it passes**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add console-plugin/src/pages/Firmware.tsx console-plugin/src/pages/Firmware.test.tsx
git commit -m "feat(frontend): add Firmware page with inventory table"
```

---

## Task 17: Update Nodes Page

**Files:**
- Modify: `console-plugin/src/pages/Nodes.tsx`
- Test: `console-plugin/src/pages/Nodes.test.tsx`

**Step 1: Update Nodes.tsx with new columns and namespace filter**

Changes needed:
- Replace Temp and Power columns with Service Tag and Power State
- Add namespace dropdown filter
- Make Name hyperlink to BareMetalHost resource in Console
- Keep row click for node detail navigation

Update `console-plugin/src/pages/Nodes.tsx`:

```typescript
import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Page,
  PageSection,
  Title,
  Spinner,
  Alert,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  ThProps,
} from '@patternfly/react-table';
import { Node, HealthStatus, PowerState } from '../types';
import { getNodes } from '../services/api';
import { HealthStatusIcon } from '../components/HealthStatusIcon';
import { NamespaceDropdown } from '../components/NamespaceDropdown';

export const Nodes: React.FC = () => {
  const history = useHistory();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namespace, setNamespace] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthStatus | 'All'>('All');
  const [powerFilter, setPowerFilter] = useState<PowerState | 'All'>('All');
  const [isHealthFilterOpen, setIsHealthFilterOpen] = useState(false);
  const [isPowerFilterOpen, setIsPowerFilterOpen] = useState(false);
  const [activeSortIndex, setActiveSortIndex] = useState<number | null>(null);
  const [activeSortDirection, setActiveSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNodes(namespace || undefined);
      setNodes(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  }, [namespace]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSortableRowValues = (node: Node): (string | number)[] => [
    node.name,
    node.serviceTag,
    node.model,
    node.health,
    node.powerState,
    node.lastScanned,
  ];

  const getSortParams = (columnIndex: number): ThProps['sort'] => ({
    sortBy: {
      index: activeSortIndex ?? undefined,
      direction: activeSortDirection,
    },
    onSort: (_event, index, direction) => {
      setActiveSortIndex(index);
      setActiveSortDirection(direction);
    },
    columnIndex,
  });

  let filteredNodes = nodes;
  if (healthFilter !== 'All') {
    filteredNodes = filteredNodes.filter((n) => n.health === healthFilter);
  }
  if (powerFilter !== 'All') {
    filteredNodes = filteredNodes.filter((n) => n.powerState === powerFilter);
  }

  if (activeSortIndex !== null) {
    filteredNodes = [...filteredNodes].sort((a, b) => {
      const aValue = getSortableRowValues(a)[activeSortIndex];
      const bValue = getSortableRowValues(b)[activeSortIndex];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return activeSortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aStr = String(aValue);
      const bStr = String(bValue);
      return activeSortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }

  const getBMHUrl = (node: Node) => {
    return `/k8s/ns/${node.namespace}/metal3.io~v1alpha1~BareMetalHost/${node.name}`;
  };

  if (loading && nodes.length === 0) {
    return (
      <Page>
        <PageSection><Spinner aria-label="Loading" /></PageSection>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <PageSection>
          <Alert variant="danger" title="Error">{error}</Alert>
        </PageSection>
      </Page>
    );
  }

  return (
    <Page>
      <PageSection variant="light">
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Title headingLevel="h1">Nodes</Title>
          </FlexItem>
          <FlexItem>
            <NamespaceDropdown selected={namespace} onSelect={setNamespace} />
          </FlexItem>
        </Flex>
      </PageSection>
      <PageSection>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Select
                isOpen={isHealthFilterOpen}
                selected={healthFilter}
                onSelect={(_e, value) => {
                  setHealthFilter(value as HealthStatus | 'All');
                  setIsHealthFilterOpen(false);
                }}
                onOpenChange={setIsHealthFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsHealthFilterOpen(!isHealthFilterOpen)} isExpanded={isHealthFilterOpen}>
                    Health: {healthFilter}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="All">All</SelectOption>
                  <SelectOption value="OK">OK</SelectOption>
                  <SelectOption value="Warning">Warning</SelectOption>
                  <SelectOption value="Critical">Critical</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
            <ToolbarItem>
              <Select
                isOpen={isPowerFilterOpen}
                selected={powerFilter}
                onSelect={(_e, value) => {
                  setPowerFilter(value as PowerState | 'All');
                  setIsPowerFilterOpen(false);
                }}
                onOpenChange={setIsPowerFilterOpen}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={() => setIsPowerFilterOpen(!isPowerFilterOpen)} isExpanded={isPowerFilterOpen}>
                    Power: {powerFilter}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  <SelectOption value="All">All</SelectOption>
                  <SelectOption value="On">On</SelectOption>
                  <SelectOption value="Off">Off</SelectOption>
                </SelectList>
              </Select>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table aria-label="Nodes table">
          <Thead>
            <Tr>
              <Th sort={getSortParams(0)}>Name</Th>
              <Th sort={getSortParams(1)}>Service Tag</Th>
              <Th sort={getSortParams(2)}>Model</Th>
              <Th sort={getSortParams(3)}>Health</Th>
              <Th sort={getSortParams(4)}>Power State</Th>
              <Th sort={getSortParams(5)}>Last Scanned</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredNodes.map((node) => (
              <Tr
                key={node.name}
                isClickable
                onRowClick={() => history.push(`/baremetal-insights/nodes/${node.name}`)}
              >
                <Td dataLabel="Name">
                  <Button
                    variant="link"
                    isInline
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = getBMHUrl(node);
                    }}
                  >
                    {node.name}
                  </Button>
                </Td>
                <Td dataLabel="Service Tag">{node.serviceTag || '-'}</Td>
                <Td dataLabel="Model">{node.model}</Td>
                <Td dataLabel="Health">
                  <HealthStatusIcon status={node.health} showLabel />
                </Td>
                <Td dataLabel="Power State">{node.powerState || '-'}</Td>
                <Td dataLabel="Last Scanned">{new Date(node.lastScanned).toLocaleString()}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </PageSection>
    </Page>
  );
};

export default Nodes;
```

**Step 2: Update test file**

Update `console-plugin/src/pages/Nodes.test.tsx` to mock the new columns.

**Step 3: Run tests**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add console-plugin/src/pages/Nodes.tsx console-plugin/src/pages/Nodes.test.tsx
git commit -m "feat(frontend): update Nodes page with new columns and namespace filter"
```

---

## Task 18: Update NodeDetail - Remove Firmware Tab

**Files:**
- Modify: `console-plugin/src/pages/NodeDetail.tsx`
- Test: `console-plugin/src/pages/NodeDetail.test.tsx`

**Step 1: Update NodeDetail.tsx**

Remove the Firmware tab from NodeDetail. Keep Health, Thermal, Power, Events tabs.

In `console-plugin/src/pages/NodeDetail.tsx`:
- Remove FirmwareTab import
- Remove firmware state and getNodeFirmware call
- Remove Firmware tab from Tabs component
- Renumber remaining tabs

**Step 2: Run tests**

Run: `cd console-plugin && npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add console-plugin/src/pages/NodeDetail.tsx console-plugin/src/pages/NodeDetail.test.tsx
git commit -m "feat(frontend): remove Firmware tab from NodeDetail"
```

---

## Task 19: Update Navigation Extensions

**Files:**
- Modify: `console-plugin/console-extensions.json`

**Step 1: Update console-extensions.json**

```json
[
  {
    "type": "console.navigation/section",
    "properties": {
      "id": "baremetal-insights",
      "perspective": "admin",
      "name": "BareMetal Insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "baremetal-dashboard",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Dashboard",
      "href": "/baremetal-insights"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "baremetal-nodes",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Nodes",
      "href": "/baremetal-insights/nodes"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "baremetal-firmware",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Firmware",
      "href": "/baremetal-insights/firmware"
    }
  },
  {
    "type": "console.navigation/href",
    "properties": {
      "id": "baremetal-events",
      "perspective": "admin",
      "section": "baremetal-insights",
      "name": "Health Events",
      "href": "/baremetal-insights/events"
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/baremetal-insights",
      "component": {
        "$codeRef": "Dashboard"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/baremetal-insights/nodes",
      "component": {
        "$codeRef": "Nodes"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": false,
      "path": "/baremetal-insights/nodes/:name",
      "component": {
        "$codeRef": "NodeDetail"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/baremetal-insights/firmware",
      "component": {
        "$codeRef": "Firmware"
      }
    }
  },
  {
    "type": "console.page/route",
    "properties": {
      "exact": true,
      "path": "/baremetal-insights/events",
      "component": {
        "$codeRef": "HealthEvents"
      }
    }
  }
]
```

**Step 2: Run build to verify**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add console-plugin/console-extensions.json
git commit -m "feat(frontend): update navigation with Dashboard and Firmware entries"
```

---

## Task 20: Run Full Test Suite and Fix Issues

**Files:**
- All files

**Step 1: Run all backend tests**

Run: `go test ./... -v`
Expected: All tests pass

**Step 2: Run all frontend tests**

Run: `cd console-plugin && npm test`
Expected: All tests pass (28+ passing, may have 1 pre-existing failure in NodeDetail.test.tsx)

**Step 3: Run build**

Run: `cd console-plugin && npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found**

Address any test failures or build errors.

**Step 5: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: address test and build issues"
```

---

## Testing Checklist

After implementation, verify:

- [ ] Dashboard shows summary strip with correct counts
- [ ] Dashboard expandable cards work
- [ ] Namespace dropdown filters all views
- [ ] Refresh countdown displays and updates
- [ ] Nodes page shows new columns (Service Tag, Power State)
- [ ] Nodes page Name links to BareMetalHost resource
- [ ] Nodes page row click navigates to node detail
- [ ] Firmware page shows summary card
- [ ] Firmware page table is filterable and sortable
- [ ] Node detail no longer has Firmware tab
- [ ] Navigation shows Dashboard, Nodes, Firmware, Health Events
- [ ] All API endpoints respond correctly with namespace filter
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Frontend builds successfully
