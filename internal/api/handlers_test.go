package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
	"github.com/cragr/openshift-baremetal-insights/internal/store"
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

	srv := NewServer(s, ":8080", "", "")

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

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes/worker-0/firmware", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestGetNodeHandler_NotFound(t *testing.T) {
	s := store.New()
	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/nodes/nonexistent/firmware", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected status 404, got %d", w.Code)
	}
}

func TestHealthHandler(t *testing.T) {
	s := store.New()
	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response map[string]string
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("expected status ok, got %s", response["status"])
	}
}

func TestListUpdatesHandler(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:  "worker-0",
		Model: "PowerEdge R640",
		Firmware: []models.FirmwareComponent{
			{
				ID:               "BIOS",
				Name:             "BIOS",
				ComponentType:    "BIOS",
				CurrentVersion:   "2.18.1",
				AvailableVersion: "2.19.1",
			},
			{
				ID:               "iDRAC",
				Name:             "iDRAC",
				ComponentType:    "Firmware",
				CurrentVersion:   "6.10.00.00",
				AvailableVersion: "6.10.30.00",
			},
		},
	})
	s.SetNode(models.Node{
		Name:  "worker-1",
		Model: "PowerEdge R640",
		Firmware: []models.FirmwareComponent{
			{
				ID:               "BIOS",
				Name:             "BIOS",
				ComponentType:    "BIOS",
				CurrentVersion:   "2.18.1",
				AvailableVersion: "2.19.1",
			},
		},
	})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/updates", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response struct {
		Updates []struct {
			ComponentType    string   `json:"componentType"`
			AvailableVersion string   `json:"availableVersion"`
			AffectedNodes    []string `json:"affectedNodes"`
		} `json:"updates"`
	}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Updates) == 0 {
		t.Error("expected at least one update")
	}
}

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

func TestServer_Dashboard(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:       "node-1",
		Namespace:  "test-ns",
		Health:     models.HealthOK,
		PowerState: models.PowerOn,
	})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/dashboard", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp models.DashboardStats
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.TotalNodes != 1 {
		t.Errorf("totalNodes = %d, want 1", resp.TotalNodes)
	}
}

func TestServer_ListNamespaces(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{Name: "node-1", Namespace: "ns-a"})
	s.SetNode(models.Node{Name: "node-2", Namespace: "ns-b"})

	srv := NewServer(s, ":8080", "", "")

	req := httptest.NewRequest("GET", "/api/v1/namespaces", nil)
	w := httptest.NewRecorder()
	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want %d", w.Code, http.StatusOK)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	namespaces := resp["namespaces"].([]interface{})
	if len(namespaces) != 2 {
		t.Errorf("namespaces count = %d, want 2", len(namespaces))
	}
}
