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
