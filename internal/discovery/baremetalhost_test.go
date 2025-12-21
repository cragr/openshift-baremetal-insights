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
