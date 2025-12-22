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

// CatalogEntry represents a firmware update available in Dell's catalog
type CatalogEntry struct {
	ComponentID   string `json:"componentId"`
	ComponentType string `json:"componentType"`
	SystemModelID string `json:"systemModelId"`
	Version       string `json:"version"`
	ReleaseDate   string `json:"releaseDate"`
	Criticality   string `json:"criticality"` // "Critical", "Recommended", "Optional"
	DownloadURL   string `json:"downloadUrl"`
	FileName      string `json:"fileName"`
	SizeMB        int    `json:"sizeMb"`
}

// CatalogKey creates a lookup key for catalog entries
func CatalogKey(systemModel, componentID string) string {
	return systemModel + "|" + componentID
}
