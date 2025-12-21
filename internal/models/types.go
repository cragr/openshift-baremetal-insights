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
