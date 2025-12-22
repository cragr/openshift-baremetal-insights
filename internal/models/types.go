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

// HealthStatus represents component health state
type HealthStatus string

const (
	HealthOK       HealthStatus = "OK"
	HealthWarning  HealthStatus = "Warning"
	HealthCritical HealthStatus = "Critical"
	HealthUnknown  HealthStatus = "Unknown"
)

// ComponentHealth represents health of a single component type
type ComponentHealth struct {
	Name    string       `json:"name"`
	Status  HealthStatus `json:"status"`
	Details string       `json:"details,omitempty"`
}

// IsHealthy returns true if status is OK
func (c *ComponentHealth) IsHealthy() bool {
	return c.Status == HealthOK
}

// HealthRollup aggregates health across component types
type HealthRollup struct {
	Processors    HealthStatus `json:"processors"`
	Memory        HealthStatus `json:"memory"`
	PowerSupplies HealthStatus `json:"powerSupplies"`
	Fans          HealthStatus `json:"fans"`
	Storage       HealthStatus `json:"storage"`
	Network       HealthStatus `json:"network"`
}

// ThermalSummary holds temperature and fan data
type ThermalSummary struct {
	InletTempC  int          `json:"inletTempC"`
	MaxTempC    int          `json:"maxTempC"`
	FanCount    int          `json:"fanCount"`
	FansHealthy int          `json:"fansHealthy"`
	Status      HealthStatus `json:"status"`
}

// PowerSummary holds power consumption and PSU data
type PowerSummary struct {
	CurrentWatts int          `json:"currentWatts"`
	PSUCount     int          `json:"psuCount"`
	PSUsHealthy  int          `json:"psusHealthy"`
	Redundancy   string       `json:"redundancy"`
	Status       HealthStatus `json:"status"`
}

// ThermalReading represents a single temperature sensor
type ThermalReading struct {
	Name   string       `json:"name"`
	TempC  int          `json:"tempC"`
	Status HealthStatus `json:"status"`
}

// FanReading represents a single fan
type FanReading struct {
	Name   string       `json:"name"`
	RPM    int          `json:"rpm"`
	Status HealthStatus `json:"status"`
}

// ThermalDetail provides full thermal information for a node
type ThermalDetail struct {
	Temperatures []ThermalReading `json:"temperatures"`
	Fans         []FanReading     `json:"fans"`
}

// PSUReading represents a single power supply unit
type PSUReading struct {
	Name      string       `json:"name"`
	Status    HealthStatus `json:"status"`
	CapacityW int          `json:"capacityW"`
}

// PowerDetail provides full power information for a node
type PowerDetail struct {
	CurrentWatts int          `json:"currentWatts"`
	PSUs         []PSUReading `json:"psus"`
	Redundancy   string       `json:"redundancy"`
}

// HealthEvent represents a system event log entry
type HealthEvent struct {
	ID        string       `json:"id"`
	Timestamp time.Time    `json:"timestamp"`
	Severity  HealthStatus `json:"severity"`
	Message   string       `json:"message"`
	NodeName  string       `json:"nodeName,omitempty"`
}
