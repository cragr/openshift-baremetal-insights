package redfish

import (
	"context"
	"crypto/tls"
	"fmt"
	"net/http"
	"time"

	"github.com/stmcginnis/gofish"
	"github.com/stmcginnis/gofish/redfish"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// RawFirmware represents raw firmware data from Redfish
type RawFirmware struct {
	ID          string
	Name        string
	Version     string
	Updateable  bool
	Description string
}

// Client wraps Redfish API operations
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new Redfish client
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
			Transport: &http.Transport{
				TLSClientConfig: &tls.Config{
					InsecureSkipVerify: true, // iDRACs use self-signed certs
				},
			},
		},
	}
}

// GetFirmwareInventory fetches firmware inventory from an iDRAC
func (c *Client) GetFirmwareInventory(ctx context.Context, bmcAddress, username, password string) ([]models.FirmwareComponent, *models.Node, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	// Get system info
	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get systems: %w", err)
	}

	var node *models.Node
	if len(systems) > 0 {
		sys := systems[0]
		node = &models.Node{
			Model:        sys.Model,
			Manufacturer: sys.Manufacturer,
			ServiceTag:   sys.SKU,
		}
	}

	// Get firmware inventory
	updateService, err := service.UpdateService()
	if err != nil {
		return nil, node, fmt.Errorf("failed to get update service: %w", err)
	}

	inventory, err := updateService.FirmwareInventories()
	if err != nil {
		return nil, node, fmt.Errorf("failed to get firmware inventory: %w", err)
	}

	components := c.parseFirmwareInventory(inventory)
	return components, node, nil
}

func (c *Client) parseFirmwareInventory(inventory []*redfish.SoftwareInventory) []models.FirmwareComponent {
	components := make([]models.FirmwareComponent, 0, len(inventory))

	for _, fw := range inventory {
		components = append(components, models.FirmwareComponent{
			ID:             fw.ID,
			Name:           fw.Name,
			CurrentVersion: fw.Version,
			Updateable:     fw.Updateable,
			ComponentType:  classifyComponent(fw.Name),
		})
	}

	return components
}

// ParseFirmwareInventory converts raw firmware data to models (for testing)
func (c *Client) ParseFirmwareInventory(raw []RawFirmware) []models.FirmwareComponent {
	components := make([]models.FirmwareComponent, 0, len(raw))

	for _, fw := range raw {
		components = append(components, models.FirmwareComponent{
			ID:             fw.ID,
			Name:           fw.Name,
			CurrentVersion: fw.Version,
			Updateable:     fw.Updateable,
			ComponentType:  classifyComponent(fw.Name),
		})
	}

	return components
}

func classifyComponent(name string) string {
	// Simple classification based on component name
	switch {
	case contains(name, "BIOS"):
		return "BIOS"
	case contains(name, "iDRAC", "BMC"):
		return "BMC"
	case contains(name, "NIC", "Network", "Ethernet"):
		return "NIC"
	case contains(name, "RAID", "PERC", "Storage"):
		return "Storage"
	case contains(name, "PSU", "Power"):
		return "Power"
	case contains(name, "CPLD"):
		return "CPLD"
	default:
		return "Other"
	}
}

func contains(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

func parseHealthStatus(s string) models.HealthStatus {
	switch s {
	case "OK":
		return models.HealthOK
	case "Warning":
		return models.HealthWarning
	case "Critical":
		return models.HealthCritical
	default:
		return models.HealthUnknown
	}
}

// GetSystemHealth fetches health rollup from Redfish Systems endpoint
func (c *Client) GetSystemHealth(ctx context.Context, bmcAddress, username, password string) (*models.HealthRollup, models.HealthStatus, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, models.HealthUnknown, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	systems, err := service.Systems()
	if err != nil {
		return nil, models.HealthUnknown, fmt.Errorf("failed to get systems: %w", err)
	}

	if len(systems) == 0 {
		return nil, models.HealthUnknown, fmt.Errorf("no systems found")
	}

	sys := systems[0]
	overallHealth := parseHealthStatus(string(sys.Status.Health))

	rollup := &models.HealthRollup{
		Processors:    models.HealthUnknown,
		Memory:        models.HealthUnknown,
		PowerSupplies: models.HealthUnknown,
		Fans:          models.HealthUnknown,
		Storage:       models.HealthUnknown,
		Network:       models.HealthUnknown,
	}

	return rollup, overallHealth, nil
}

// GetThermalData fetches temperature and fan data from Redfish Chassis
func (c *Client) GetThermalData(ctx context.Context, bmcAddress, username, password string) (*models.ThermalDetail, *models.ThermalSummary, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	chassis, err := service.Chassis()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get chassis: %w", err)
	}

	if len(chassis) == 0 {
		return nil, nil, fmt.Errorf("no chassis found")
	}

	thermal, err := chassis[0].Thermal()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get thermal: %w", err)
	}

	detail := &models.ThermalDetail{
		Temperatures: make([]models.ThermalReading, 0),
		Fans:         make([]models.FanReading, 0),
	}

	var maxTemp, inletTemp int
	for _, t := range thermal.Temperatures {
		reading := models.ThermalReading{
			Name:   t.Name,
			TempC:  int(t.ReadingCelsius),
			Status: parseHealthStatus(string(t.Status.Health)),
		}
		detail.Temperatures = append(detail.Temperatures, reading)

		if int(t.ReadingCelsius) > maxTemp {
			maxTemp = int(t.ReadingCelsius)
		}
		if contains(t.Name, "Inlet", "Ambient") {
			inletTemp = int(t.ReadingCelsius)
		}
	}

	fansHealthy := 0
	for _, f := range thermal.Fans {
		status := parseHealthStatus(string(f.Status.Health))
		reading := models.FanReading{
			Name:   f.Name,
			RPM:    int(f.Reading),
			Status: status,
		}
		detail.Fans = append(detail.Fans, reading)
		if status == models.HealthOK {
			fansHealthy++
		}
	}

	summary := &models.ThermalSummary{
		InletTempC:  inletTemp,
		MaxTempC:    maxTemp,
		FanCount:    len(thermal.Fans),
		FansHealthy: fansHealthy,
		Status:      models.HealthOK,
	}

	if fansHealthy < len(thermal.Fans) {
		summary.Status = models.HealthWarning
	}

	return detail, summary, nil
}

// GetPowerData fetches power supply and consumption data from Redfish Chassis
func (c *Client) GetPowerData(ctx context.Context, bmcAddress, username, password string) (*models.PowerDetail, *models.PowerSummary, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	chassis, err := service.Chassis()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get chassis: %w", err)
	}

	if len(chassis) == 0 {
		return nil, nil, fmt.Errorf("no chassis found")
	}

	power, err := chassis[0].Power()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get power: %w", err)
	}

	detail := &models.PowerDetail{
		PSUs: make([]models.PSUReading, 0),
	}

	// Get current power consumption
	if len(power.PowerControl) > 0 {
		detail.CurrentWatts = int(power.PowerControl[0].PowerConsumedWatts)
	}

	psusHealthy := 0
	for _, psu := range power.PowerSupplies {
		status := parseHealthStatus(string(psu.Status.Health))
		reading := models.PSUReading{
			Name:      psu.Name,
			Status:    status,
			CapacityW: int(psu.PowerCapacityWatts),
		}
		detail.PSUs = append(detail.PSUs, reading)
		if status == models.HealthOK {
			psusHealthy++
		}
	}

	redundancy := "Full"
	if psusHealthy < len(power.PowerSupplies) {
		redundancy = "Lost"
	}
	detail.Redundancy = redundancy

	summary := &models.PowerSummary{
		CurrentWatts: detail.CurrentWatts,
		PSUCount:     len(power.PowerSupplies),
		PSUsHealthy:  psusHealthy,
		Redundancy:   redundancy,
		Status:       models.HealthOK,
	}

	if psusHealthy < len(power.PowerSupplies) {
		summary.Status = models.HealthCritical
	}

	return detail, summary, nil
}

// GetEvents fetches System Event Log entries from Redfish Manager
func (c *Client) GetEvents(ctx context.Context, bmcAddress, username, password string, limit int) ([]models.HealthEvent, error) {
	config := gofish.ClientConfig{
		Endpoint:   fmt.Sprintf("https://%s", bmcAddress),
		Username:   username,
		Password:   password,
		Insecure:   true,
		HTTPClient: c.httpClient,
	}

	client, err := gofish.Connect(config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to BMC: %w", err)
	}
	defer client.Logout()

	service := client.GetService()
	managers, err := service.Managers()
	if err != nil {
		return nil, fmt.Errorf("failed to get managers: %w", err)
	}

	if len(managers) == 0 {
		return nil, fmt.Errorf("no managers found")
	}

	logServices, err := managers[0].LogServices()
	if err != nil {
		return nil, fmt.Errorf("failed to get log services: %w", err)
	}

	events := make([]models.HealthEvent, 0)

	for _, ls := range logServices {
		if ls.ID != "Sel" && ls.ID != "SEL" {
			continue
		}

		entries, err := ls.Entries()
		if err != nil {
			continue
		}

		for i, entry := range entries {
			if limit > 0 && i >= limit {
				break
			}

			severity := models.HealthOK
			switch entry.Severity {
			case "Critical":
				severity = models.HealthCritical
			case "Warning":
				severity = models.HealthWarning
			}

			// Parse timestamp from ISO8601 string
			timestamp, err := time.Parse(time.RFC3339, entry.Created)
			if err != nil {
				// If parsing fails, use current time
				timestamp = time.Now()
			}

			events = append(events, models.HealthEvent{
				ID:        entry.ID,
				Timestamp: timestamp,
				Severity:  severity,
				Message:   entry.Message,
			})
		}
	}

	return events, nil
}
