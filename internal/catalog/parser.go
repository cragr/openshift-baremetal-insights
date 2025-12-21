package catalog

import (
	"encoding/xml"
	"fmt"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// XML structures for Dell catalog
type manifest struct {
	XMLName    xml.Name            `xml:"Manifest"`
	Components []softwareComponent `xml:"SoftwareComponent"`
}

type softwareComponent struct {
	PackageID        string           `xml:"packageID,attr"`
	ReleaseDate      string           `xml:"releaseDate,attr"`
	VendorVersion    string           `xml:"vendorVersion,attr"`
	Path             string           `xml:"path,attr"`
	Size             int64            `xml:"size,attr"`
	Name             componentName    `xml:"Name"`
	ComponentType    componentType    `xml:"ComponentType"`
	Criticality      criticality      `xml:"Criticality"`
	SupportedSystems supportedSystems `xml:"SupportedSystems"`
}

type componentName struct {
	Display string `xml:"Display"`
}

type componentType struct {
	Value string `xml:"value,attr"`
}

type criticality struct {
	Value string `xml:"value,attr"`
}

type supportedSystems struct {
	Brands []brand `xml:"Brand"`
}

type brand struct {
	Models []model `xml:"Model"`
}

type model struct {
	SystemID string `xml:"systemID,attr"`
	Name     string `xml:",chardata"`
}

// Parser parses Dell catalog XML
type Parser struct{}

// NewParser creates a new catalog parser
func NewParser() *Parser {
	return &Parser{}
}

// Parse parses XML data into catalog entries
func (p *Parser) Parse(data []byte) ([]models.CatalogEntry, error) {
	var m manifest
	if err := xml.Unmarshal(data, &m); err != nil {
		return nil, fmt.Errorf("failed to parse catalog XML: %w", err)
	}

	var entries []models.CatalogEntry

	for _, comp := range m.Components {
		componentType := mapComponentType(comp.ComponentType.Value)

		// Create an entry for each supported system model
		for _, brand := range comp.SupportedSystems.Brands {
			for _, model := range brand.Models {
				entry := models.CatalogEntry{
					ComponentID:   comp.PackageID,
					ComponentType: componentType,
					SystemModelID: model.Name,
					Version:       comp.VendorVersion,
					ReleaseDate:   comp.ReleaseDate,
					Criticality:   comp.Criticality.Value,
					DownloadURL:   "https://downloads.dell.com/" + comp.Path,
					FileName:      comp.Name.Display,
					SizeMB:        int(comp.Size / 1024 / 1024),
				}
				entries = append(entries, entry)
			}
		}
	}

	return entries, nil
}

// mapComponentType maps Dell component type codes to readable names
func mapComponentType(code string) string {
	types := map[string]string{
		"BIOS": "BIOS",
		"FRMW": "Firmware",
		"DRVR": "Driver",
		"APAC": "Application",
	}
	if t, ok := types[code]; ok {
		return t
	}
	return code
}
