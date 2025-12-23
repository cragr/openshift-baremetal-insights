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
