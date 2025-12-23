package redfish

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/stmcginnis/gofish"
	"github.com/stmcginnis/gofish/common"
	"github.com/stmcginnis/gofish/redfish"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
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
			PowerState:   parsePowerState(sys.PowerState),
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

// formatLinkSpeed converts Mbps to human-readable format
func formatLinkSpeed(mbps int) string {
	if mbps >= 1000 {
		return fmt.Sprintf("%d Gbps", mbps/1000)
	}
	if mbps > 0 {
		return fmt.Sprintf("%d Mbps", mbps)
	}
	return "Unknown"
}

// normalizeLinkStatus converts Redfish LinkStatus to simplified status
func normalizeLinkStatus(status string) string {
	switch status {
	case "LinkUp":
		return "Up"
	case "LinkDown", "NoLink":
		return "Down"
	default:
		return "Unknown"
	}
}

func parseHealthStatus(h common.Health) models.HealthStatus {
	switch h {
	case common.OKHealth:
		return models.HealthOK
	case common.WarningHealth:
		return models.HealthWarning
	case common.CriticalHealth:
		return models.HealthCritical
	default:
		return models.HealthUnknown
	}
}

// parsePowerState converts gofish PowerState to internal PowerState
func parsePowerState(ps redfish.PowerState) models.PowerState {
	switch ps {
	case redfish.OnPowerState:
		return models.PowerOn
	case redfish.OffPowerState:
		return models.PowerOff
	default:
		return models.PowerUnknown
	}
}

// aggregateHealth returns the worst health status from a slice
func aggregateHealth(statuses []models.HealthStatus) models.HealthStatus {
	worst := models.HealthOK
	for _, s := range statuses {
		if s == models.HealthCritical {
			return models.HealthCritical
		}
		if s == models.HealthWarning {
			worst = models.HealthWarning
		}
		if s == models.HealthUnknown && worst == models.HealthOK {
			worst = models.HealthUnknown
		}
	}
	return worst
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
	overallHealth := parseHealthStatus(sys.Status.Health)

	rollup := &models.HealthRollup{
		Processors:    models.HealthUnknown,
		Memory:        models.HealthUnknown,
		PowerSupplies: models.HealthUnknown,
		Fans:          models.HealthUnknown,
		Storage:       models.HealthUnknown,
		Network:       models.HealthUnknown,
	}

	// Get Processor health from /redfish/v1/Systems/{systemId}/Processors
	processors, err := sys.Processors()
	if err == nil && len(processors) > 0 {
		var procStatuses []models.HealthStatus
		for _, proc := range processors {
			procStatuses = append(procStatuses, parseHealthStatus(proc.Status.Health))
		}
		rollup.Processors = aggregateHealth(procStatuses)
	} else if err != nil {
		log.Printf("Failed to get processors: %v", err)
	}

	// Get Memory health from /redfish/v1/Systems/{systemId}/Memory
	memory, err := sys.Memory()
	if err == nil && len(memory) > 0 {
		var memStatuses []models.HealthStatus
		for _, mem := range memory {
			memStatuses = append(memStatuses, parseHealthStatus(mem.Status.Health))
		}
		rollup.Memory = aggregateHealth(memStatuses)
	} else if err != nil {
		log.Printf("Failed to get memory: %v", err)
	}

	// Get Storage health from /redfish/v1/Systems/{systemId}/Storage
	storage, err := sys.Storage()
	if err == nil && len(storage) > 0 {
		var storageStatuses []models.HealthStatus
		for _, stor := range storage {
			storageStatuses = append(storageStatuses, parseHealthStatus(stor.Status.Health))
		}
		rollup.Storage = aggregateHealth(storageStatuses)
	} else if err != nil {
		log.Printf("Failed to get storage: %v", err)
	}

	// Get Network health from EthernetInterfaces
	ethInterfaces, err := sys.EthernetInterfaces()
	if err == nil && len(ethInterfaces) > 0 {
		var netStatuses []models.HealthStatus
		for _, eth := range ethInterfaces {
			netStatuses = append(netStatuses, parseHealthStatus(eth.Status.Health))
		}
		rollup.Network = aggregateHealth(netStatuses)
	} else if err != nil {
		log.Printf("Failed to get ethernet interfaces: %v", err)
	}

	// Get Chassis for fans and power supplies
	chassis, err := service.Chassis()
	if err == nil && len(chassis) > 0 {
		ch := chassis[0]

		// Try to get fans from ThermalSubsystem first, then legacy Thermal
		fans, err := ch.Fans()
		if err == nil && len(fans) > 0 {
			var fanStatuses []models.HealthStatus
			for _, fan := range fans {
				fanStatuses = append(fanStatuses, parseHealthStatus(fan.Status.Health))
			}
			rollup.Fans = aggregateHealth(fanStatuses)
		} else {
			// Fall back to legacy Thermal endpoint
			thermal, err := ch.Thermal()
			if err == nil && thermal != nil && len(thermal.Fans) > 0 {
				var fanStatuses []models.HealthStatus
				for _, fan := range thermal.Fans {
					fanStatuses = append(fanStatuses, parseHealthStatus(fan.Status.Health))
				}
				rollup.Fans = aggregateHealth(fanStatuses)
			}
		}

		// Try to get power supplies from PowerSubsystem first, then legacy Power
		psus, err := ch.PowerSupplies()
		if err == nil && len(psus) > 0 {
			var psuStatuses []models.HealthStatus
			for _, psu := range psus {
				psuStatuses = append(psuStatuses, parseHealthStatus(psu.Status.Health))
			}
			rollup.PowerSupplies = aggregateHealth(psuStatuses)
		} else {
			// Fall back to legacy Power endpoint
			power, err := ch.Power()
			if err == nil && power != nil && len(power.PowerSupplies) > 0 {
				var psuStatuses []models.HealthStatus
				for _, psu := range power.PowerSupplies {
					psuStatuses = append(psuStatuses, parseHealthStatus(psu.Status.Health))
				}
				rollup.PowerSupplies = aggregateHealth(psuStatuses)
			}
		}
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

	// Find the main system chassis (not enclosure or other types)
	var mainChassis *redfish.Chassis
	for _, ch := range chassis {
		if ch.ChassisType == redfish.RackMountChassisType ||
			ch.ChassisType == redfish.BladeChassisType ||
			ch.ChassisType == redfish.StandAloneChassisType {
			mainChassis = ch
			break
		}
	}
	if mainChassis == nil {
		mainChassis = chassis[0]
	}

	detail := &models.ThermalDetail{
		Temperatures: make([]models.ThermalReading, 0),
		Fans:         make([]models.FanReading, 0),
	}

	var maxTemp, inletTemp int
	fansHealthy := 0
	totalFans := 0

	// Try new ThermalSubsystem API first
	thermalSub, err := mainChassis.ThermalSubsystem()
	if err == nil && thermalSub != nil {
		// Get thermal metrics for temperatures
		metrics, err := thermalSub.ThermalMetrics()
		if err == nil && metrics != nil {
			for _, temp := range metrics.TemperatureReadingsCelsius {
				reading := models.ThermalReading{
					Name:   temp.DeviceName,
					TempC:  int(temp.Reading),
					Status: models.HealthOK, // ThermalMetrics doesn't have per-sensor status
				}
				detail.Temperatures = append(detail.Temperatures, reading)

				if int(temp.Reading) > maxTemp {
					maxTemp = int(temp.Reading)
				}
				if contains(temp.DeviceName, "Inlet", "Ambient", "System Board Inlet") {
					inletTemp = int(temp.Reading)
				}
			}
		}

		// Get fans from ThermalSubsystem
		fans, err := thermalSub.Fans()
		if err == nil {
			for _, fan := range fans {
				status := parseHealthStatus(fan.Status.Health)
				reading := models.FanReading{
					Name:   fan.Name,
					RPM:    int(fan.SpeedPercent.Reading),
					Status: status,
				}
				detail.Fans = append(detail.Fans, reading)
				totalFans++
				if status == models.HealthOK {
					fansHealthy++
				}
			}
		}
	}

	// Fall back to legacy Thermal endpoint if no data from ThermalSubsystem
	if len(detail.Temperatures) == 0 || len(detail.Fans) == 0 {
		thermal, err := mainChassis.Thermal()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get thermal data: %w", err)
		}
		if thermal == nil {
			return nil, nil, fmt.Errorf("thermal data not available")
		}

		// Get temperatures from legacy endpoint
		if len(detail.Temperatures) == 0 {
			for _, t := range thermal.Temperatures {
				reading := models.ThermalReading{
					Name:   t.Name,
					TempC:  int(t.ReadingCelsius),
					Status: parseHealthStatus(t.Status.Health),
				}
				detail.Temperatures = append(detail.Temperatures, reading)

				if int(t.ReadingCelsius) > maxTemp {
					maxTemp = int(t.ReadingCelsius)
				}
				if contains(t.Name, "Inlet", "Ambient", "System Board Inlet") {
					inletTemp = int(t.ReadingCelsius)
				}
			}
		}

		// Get fans from legacy endpoint
		if len(detail.Fans) == 0 {
			for _, f := range thermal.Fans {
				status := parseHealthStatus(f.Status.Health)
				reading := models.FanReading{
					Name:   f.Name,
					RPM:    int(f.Reading),
					Status: status,
				}
				detail.Fans = append(detail.Fans, reading)
				totalFans++
				if status == models.HealthOK {
					fansHealthy++
				}
			}
		}
	}

	summary := &models.ThermalSummary{
		InletTempC:  inletTemp,
		MaxTempC:    maxTemp,
		FanCount:    totalFans,
		FansHealthy: fansHealthy,
		Status:      models.HealthOK,
	}

	if totalFans > 0 && fansHealthy < totalFans {
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

	// Find the main system chassis
	var mainChassis *redfish.Chassis
	for _, ch := range chassis {
		if ch.ChassisType == redfish.RackMountChassisType ||
			ch.ChassisType == redfish.BladeChassisType ||
			ch.ChassisType == redfish.StandAloneChassisType {
			mainChassis = ch
			break
		}
	}
	if mainChassis == nil {
		mainChassis = chassis[0]
	}

	detail := &models.PowerDetail{
		PSUs: make([]models.PSUReading, 0),
	}

	psusHealthy := 0
	totalPSUs := 0

	// Try new PowerSubsystem API first
	powerSub, err := mainChassis.PowerSubsystem()
	if err == nil && powerSub != nil {
		// Get power supplies from PowerSubsystem
		psus, err := mainChassis.PowerSupplies()
		if err == nil {
			for _, psu := range psus {
				status := parseHealthStatus(psu.Status.Health)
				reading := models.PSUReading{
					Name:      psu.Name,
					Status:    status,
					CapacityW: int(psu.PowerCapacityWatts),
				}
				detail.PSUs = append(detail.PSUs, reading)
				totalPSUs++
				if status == models.HealthOK {
					psusHealthy++
				}
			}
		}

		// Get power consumption from EnvironmentMetrics
		envMetrics, err := mainChassis.EnvironmentMetrics()
		if err == nil && envMetrics != nil {
			detail.CurrentWatts = int(envMetrics.PowerWatts.Reading)
		}
	}

	// Fall back to legacy Power endpoint if no data
	if len(detail.PSUs) == 0 {
		power, err := mainChassis.Power()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get power data: %w", err)
		}
		if power == nil {
			return nil, nil, fmt.Errorf("power data not available")
		}

		// Get current power consumption from legacy endpoint
		if detail.CurrentWatts == 0 && len(power.PowerControl) > 0 {
			detail.CurrentWatts = int(power.PowerControl[0].PowerConsumedWatts)
		}

		// Get PSUs from legacy endpoint
		for _, psu := range power.PowerSupplies {
			status := parseHealthStatus(psu.Status.Health)
			reading := models.PSUReading{
				Name:      psu.Name,
				Status:    status,
				CapacityW: int(psu.PowerCapacityWatts),
			}
			detail.PSUs = append(detail.PSUs, reading)
			totalPSUs++
			if status == models.HealthOK {
				psusHealthy++
			}
		}
	}

	redundancy := "Full"
	if totalPSUs > 0 && psusHealthy < totalPSUs {
		redundancy = "Lost"
	}
	detail.Redundancy = redundancy

	summary := &models.PowerSummary{
		CurrentWatts: detail.CurrentWatts,
		PSUCount:     totalPSUs,
		PSUsHealthy:  psusHealthy,
		Redundancy:   redundancy,
		Status:       models.HealthOK,
	}

	if totalPSUs > 0 && psusHealthy < totalPSUs {
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

// GetNetworkAdapters fetches network interface details from Redfish
func (c *Client) GetNetworkAdapters(ctx context.Context, bmcAddress, username, password string) ([]models.NetworkAdapter, error) {
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
	systems, err := service.Systems()
	if err != nil {
		return nil, fmt.Errorf("failed to get systems: %w", err)
	}

	if len(systems) == 0 {
		return nil, fmt.Errorf("no systems found")
	}

	adapters := make([]models.NetworkAdapter, 0)

	// Get EthernetInterfaces from Systems endpoint
	ethInterfaces, err := systems[0].EthernetInterfaces()
	if err != nil {
		return nil, fmt.Errorf("failed to get ethernet interfaces: %w", err)
	}

	for _, eth := range ethInterfaces {
		adapter := models.NetworkAdapter{
			Name:       eth.Name,
			Port:       eth.ID,
			MACAddress: eth.MACAddress,
			LinkStatus: normalizeLinkStatus(string(eth.LinkStatus)),
			LinkSpeed:  formatLinkSpeed(eth.SpeedMbps),
			Model:      eth.Name, // Default to name, will be enriched if NetworkAdapters available
		}
		adapters = append(adapters, adapter)
	}

	// Try to get detailed model info from Chassis NetworkAdapters
	chassis, err := service.Chassis()
	if err == nil && len(chassis) > 0 {
		for _, ch := range chassis {
			netAdapters, err := ch.NetworkAdapters()
			if err != nil || len(netAdapters) == 0 {
				continue
			}
			// Build model lookup from network adapters
			for _, na := range netAdapters {
				// Update adapters that match this network adapter's ports
				for i := range adapters {
					if contains(adapters[i].Port, na.ID) || contains(adapters[i].Name, na.ID) {
						adapters[i].Model = na.Model
					}
				}
			}
		}
	}

	return adapters, nil
}
