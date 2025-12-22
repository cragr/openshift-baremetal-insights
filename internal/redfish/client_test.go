package redfish

import (
	"testing"

	"github.com/cragr/openshift-redfish-insights/internal/models"
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
