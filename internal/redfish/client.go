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
