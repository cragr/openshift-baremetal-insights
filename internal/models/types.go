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

// PowerState represents the power state of a node
type PowerState string

const (
	PowerOn      PowerState = "On"
	PowerOff     PowerState = "Off"
	PowerUnknown PowerState = "Unknown"
)

// Severity represents update criticality
type Severity string

const (
	SeverityCritical    Severity = "Critical"
	SeverityRecommended Severity = "Recommended"
	SeverityOptional    Severity = "Optional"
)

// Node represents a discovered bare metal server
type Node struct {
	Name             string              `json:"name"`
	Namespace        string              `json:"namespace"`
	BMCAddress       string              `json:"bmcAddress"`
	Model            string              `json:"model"`
	Manufacturer     string              `json:"manufacturer"`
	ServiceTag       string              `json:"serviceTag"`
	PowerState       PowerState          `json:"powerState"`
	LastScanned      time.Time           `json:"lastScanned"`
	Status           NodeStatus          `json:"status"`
	FirmwareCount    int                 `json:"firmwareCount"`
	UpdatesAvailable int                 `json:"updatesAvailable"`
	Firmware         []FirmwareComponent `json:"firmware,omitempty"`
	// Health fields
	Health           HealthStatus        `json:"health,omitempty"`
	HealthRollup     *HealthRollup       `json:"healthRollup,omitempty"`
	ThermalSummary   *ThermalSummary     `json:"thermalSummary,omitempty"`
	PowerSummary     *PowerSummary       `json:"powerSummary,omitempty"`
}

// FirmwareComponent represents a single firmware component on a server
type FirmwareComponent struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	CurrentVersion   string   `json:"currentVersion"`
	AvailableVersion string   `json:"availableVersion,omitempty"`
	Updateable       bool     `json:"updateable"`
	ComponentType    string   `json:"componentType"`
	Severity         Severity `json:"severity,omitempty"`
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

// TaskState represents the state of a Redfish task
type TaskState string

const (
	TaskPending   TaskState = "Pending"
	TaskRunning   TaskState = "Running"
	TaskCompleted TaskState = "Completed"
	TaskFailed    TaskState = "Exception"
)

// Task represents a Redfish Task Service job
type Task struct {
	Node            string    `json:"node"`
	Namespace       string    `json:"namespace"`
	TaskID          string    `json:"taskId"`
	TaskType        string    `json:"taskType"`
	TaskState       TaskState `json:"taskState"`
	PercentComplete int       `json:"percentComplete"`
	StartTime       time.Time `json:"startTime"`
	Message         string    `json:"message"`
}

// IsComplete returns true if the task is in a terminal state
func (t *Task) IsComplete() bool {
	return t.TaskState == TaskCompleted || t.TaskState == TaskFailed
}

// HealthSummary counts nodes by health status
type HealthSummary struct {
	Healthy  int `json:"healthy"`
	Warning  int `json:"warning"`
	Critical int `json:"critical"`
}

// PowerStateSummary counts nodes by power state
type PowerStateSummary struct {
	On  int `json:"on"`
	Off int `json:"off"`
}

// UpdatesSummary counts available firmware updates
type UpdatesSummary struct {
	Total            int `json:"total"`
	Critical         int `json:"critical"`
	Recommended      int `json:"recommended"`
	Optional         int `json:"optional"`
	NodesWithUpdates int `json:"nodesWithUpdates"`
}

// JobsSummary counts Redfish tasks by state
type JobsSummary struct {
	Pending    int `json:"pending"`
	InProgress int `json:"inProgress"`
	Completed  int `json:"completed"`
}

// DashboardStats aggregates all dashboard statistics
type DashboardStats struct {
	TotalNodes     int               `json:"totalNodes"`
	HealthSummary  HealthSummary     `json:"healthSummary"`
	PowerSummary   PowerStateSummary `json:"powerSummary"`
	UpdatesSummary UpdatesSummary    `json:"updatesSummary"`
	JobsSummary    JobsSummary       `json:"jobsSummary"`
	LastRefresh    time.Time         `json:"lastRefresh"`
	NextRefresh    time.Time         `json:"nextRefresh"`
}
