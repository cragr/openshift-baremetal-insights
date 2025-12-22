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
