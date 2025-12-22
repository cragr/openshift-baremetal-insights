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

func TestCatalogEntry(t *testing.T) {
	entry := CatalogEntry{
		ComponentID:   "BIOS",
		SystemModelID: "PowerEdge R640",
		Version:       "2.19.1",
		ReleaseDate:   "2024-01-15",
		Criticality:   "Recommended",
		DownloadURL:   "https://downloads.dell.com/FOLDER123/BIOS_ABC123.EXE",
	}

	if entry.ComponentID != "BIOS" {
		t.Errorf("expected component ID BIOS, got %s", entry.ComponentID)
	}
}

func TestHealthStatus_String(t *testing.T) {
	tests := []struct {
		status HealthStatus
		want   string
	}{
		{HealthOK, "OK"},
		{HealthWarning, "Warning"},
		{HealthCritical, "Critical"},
		{HealthUnknown, "Unknown"},
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
