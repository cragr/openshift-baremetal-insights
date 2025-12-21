# Phase 2: Catalog Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Dell's firmware catalog to compare installed firmware versions against available updates and expose this through the REST API.

**Architecture:** Fetch Dell's enterprise catalog XML (gzipped), parse to build a lookup table mapping (system model + component ID) to latest available version. Cache with configurable TTL. Integrate with poller to populate `AvailableVersion` on firmware components. Add `/api/v1/updates` endpoint.

**Tech Stack:** Go 1.23+, compress/gzip, encoding/xml, net/http

---

## Task 1: Catalog Data Models

**Files:**
- Modify: `internal/models/types.go`
- Modify: `internal/models/types_test.go`

**Step 1: Write test for CatalogEntry model**

Add to `internal/models/types_test.go`:
```go
func TestCatalogEntry(t *testing.T) {
	entry := CatalogEntry{
		ComponentID:   "BIOS",
		SystemModelID: "PowerEdge R640",
		Version:       "2.19.1",
		ReleaseDate:   "2024-01-15",
		Criticality:   "Recommended",
		DownloadURL:   "https://downloads.dell.com/FOLDER123/BIOS_ABC123.EXE",
	}

	if entry.ComponentID != "BIOS" {
		t.Errorf("expected component ID BIOS, got %s", entry.ComponentID)
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/models/... -v -run TestCatalogEntry
```

Expected: FAIL - CatalogEntry undefined

**Step 3: Write CatalogEntry model**

Add to `internal/models/types.go`:
```go
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
```

**Step 4: Run test to verify it passes**

Run:
```bash
go test ./internal/models/... -v -run TestCatalogEntry
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/models/
git commit -m "feat: add CatalogEntry model for Dell firmware catalog"
```

---

## Task 2: Catalog Fetcher

**Files:**
- Create: `internal/catalog/fetcher.go`
- Create: `internal/catalog/fetcher_test.go`

**Step 1: Write test for catalog fetcher**

Create `internal/catalog/fetcher_test.go`:
```go
package catalog

import (
	"compress/gzip"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetcher_Fetch(t *testing.T) {
	// Create a mock server that returns gzipped XML
	mockXML := `<?xml version="1.0"?>
<Manifest version="2.0">
	<SoftwareComponent>
		<ComponentType value="BIOS"/>
		<SupportedSystems>
			<Brand><Model systemID="ABC123">PowerEdge R640</Model></Brand>
		</SupportedSystems>
	</SoftwareComponent>
</Manifest>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/gzip")
		gz := gzip.NewWriter(w)
		gz.Write([]byte(mockXML))
		gz.Close()
	}))
	defer server.Close()

	fetcher := NewFetcher(server.URL)
	data, err := fetcher.Fetch()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(string(data), "PowerEdge R640") {
		t.Error("expected data to contain PowerEdge R640")
	}
}

func TestFetcher_FetchError(t *testing.T) {
	fetcher := NewFetcher("http://invalid.localhost:99999")
	_, err := fetcher.Fetch()
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/catalog/... -v
```

Expected: FAIL - package does not exist

**Step 3: Write fetcher implementation**

Create `internal/catalog/fetcher.go`:
```go
package catalog

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Fetcher downloads catalog files from a URL
type Fetcher struct {
	url    string
	client *http.Client
}

// NewFetcher creates a new catalog fetcher
func NewFetcher(url string) *Fetcher {
	return &Fetcher{
		url: url,
		client: &http.Client{
			Timeout: 5 * time.Minute, // Catalog can be large
		},
	}
}

// Fetch downloads and decompresses the catalog
func (f *Fetcher) Fetch() ([]byte, error) {
	resp, err := f.client.Get(f.url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch catalog: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("catalog fetch returned status %d", resp.StatusCode)
	}

	// Check if response is gzipped
	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Type") == "application/gzip" ||
		resp.Header.Get("Content-Encoding") == "gzip" ||
		len(f.url) > 3 && f.url[len(f.url)-3:] == ".gz" {
		gzReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzReader.Close()
		reader = gzReader
	}

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read catalog: %w", err)
	}

	return data, nil
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
go test ./internal/catalog/... -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/catalog/
git commit -m "feat: add catalog fetcher for Dell firmware catalog"
```

---

## Task 3: Catalog XML Parser

**Files:**
- Create: `internal/catalog/parser.go`
- Create: `internal/catalog/parser_test.go`

**Step 1: Write test for XML parser**

Create `internal/catalog/parser_test.go`:
```go
package catalog

import (
	"testing"
)

func TestParser_Parse(t *testing.T) {
	// Simplified Dell catalog XML structure
	xmlData := []byte(`<?xml version="1.0" encoding="utf-8"?>
<Manifest version="2.0">
	<SoftwareComponent schemaVersion="2.0" packageID="ABCD1234" releaseDate="2024-01-15"
		vendorVersion="2.19.1" path="FOLDER123/BIOS_ABC.EXE" size="16777216">
		<Name><Display>BIOS Update</Display></Name>
		<ComponentType value="BIOS"/>
		<Criticality value="Recommended"/>
		<SupportedSystems>
			<Brand>
				<Model systemID="08B4" systemIDType="PNPID">PowerEdge R640</Model>
			</Brand>
		</SupportedSystems>
	</SoftwareComponent>
	<SoftwareComponent schemaVersion="2.0" packageID="EFGH5678" releaseDate="2024-02-20"
		vendorVersion="6.10.30.00" path="FOLDER456/iDRAC_XYZ.EXE" size="33554432">
		<Name><Display>iDRAC Update</Display></Name>
		<ComponentType value="FRMW"/>
		<Criticality value="Critical"/>
		<SupportedSystems>
			<Brand>
				<Model systemID="08B4" systemIDType="PNPID">PowerEdge R640</Model>
			</Brand>
		</SupportedSystems>
	</SoftwareComponent>
</Manifest>`)

	parser := NewParser()
	entries, err := parser.Parse(xmlData)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}

	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}

	// Check BIOS entry
	bios := entries[0]
	if bios.Version != "2.19.1" {
		t.Errorf("expected BIOS version 2.19.1, got %s", bios.Version)
	}
	if bios.Criticality != "Recommended" {
		t.Errorf("expected criticality Recommended, got %s", bios.Criticality)
	}
}

func TestParser_EmptyManifest(t *testing.T) {
	xmlData := []byte(`<?xml version="1.0"?><Manifest version="2.0"></Manifest>`)

	parser := NewParser()
	entries, err := parser.Parse(xmlData)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("expected 0 entries, got %d", len(entries))
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/catalog/... -v -run TestParser
```

Expected: FAIL - Parser undefined

**Step 3: Write parser implementation**

Create `internal/catalog/parser.go`:
```go
package catalog

import (
	"encoding/xml"
	"fmt"
	"strconv"

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
```

**Step 4: Run test to verify it passes**

Run:
```bash
go test ./internal/catalog/... -v -run TestParser
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/catalog/
git commit -m "feat: add Dell catalog XML parser"
```

---

## Task 4: Catalog Cache

**Files:**
- Create: `internal/catalog/cache.go`
- Create: `internal/catalog/cache_test.go`

**Step 1: Write test for catalog cache**

Create `internal/catalog/cache_test.go`:
```go
package catalog

import (
	"testing"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

func TestCache_SetAndGet(t *testing.T) {
	cache := NewCache(1 * time.Hour)

	entries := []models.CatalogEntry{
		{ComponentType: "BIOS", SystemModelID: "PowerEdge R640", Version: "2.19.1"},
		{ComponentType: "BIOS", SystemModelID: "PowerEdge R740", Version: "2.19.1"},
	}

	cache.Set(entries)

	// Lookup by model and component type
	version, found := cache.GetLatestVersion("PowerEdge R640", "BIOS")
	if !found {
		t.Fatal("expected to find entry")
	}
	if version != "2.19.1" {
		t.Errorf("expected version 2.19.1, got %s", version)
	}
}

func TestCache_GetEntry(t *testing.T) {
	cache := NewCache(1 * time.Hour)

	entries := []models.CatalogEntry{
		{
			ComponentType: "BIOS",
			SystemModelID: "PowerEdge R640",
			Version:       "2.19.1",
			Criticality:   "Recommended",
			DownloadURL:   "https://example.com/bios.exe",
		},
	}

	cache.Set(entries)

	entry, found := cache.GetEntry("PowerEdge R640", "BIOS")
	if !found {
		t.Fatal("expected to find entry")
	}
	if entry.Criticality != "Recommended" {
		t.Errorf("expected criticality Recommended, got %s", entry.Criticality)
	}
}

func TestCache_IsStale(t *testing.T) {
	cache := NewCache(100 * time.Millisecond)

	if !cache.IsStale() {
		t.Error("empty cache should be stale")
	}

	cache.Set([]models.CatalogEntry{{ComponentType: "BIOS"}})

	if cache.IsStale() {
		t.Error("fresh cache should not be stale")
	}

	time.Sleep(150 * time.Millisecond)

	if !cache.IsStale() {
		t.Error("expired cache should be stale")
	}
}

func TestCache_NotFound(t *testing.T) {
	cache := NewCache(1 * time.Hour)
	cache.Set([]models.CatalogEntry{})

	_, found := cache.GetLatestVersion("NonExistent", "BIOS")
	if found {
		t.Error("expected not found for non-existent model")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/catalog/... -v -run TestCache
```

Expected: FAIL - Cache undefined

**Step 3: Write cache implementation**

Create `internal/catalog/cache.go`:
```go
package catalog

import (
	"sync"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// Cache stores catalog entries with TTL
type Cache struct {
	mu        sync.RWMutex
	entries   map[string]models.CatalogEntry // key: "model|componentType"
	updatedAt time.Time
	ttl       time.Duration
}

// NewCache creates a new catalog cache
func NewCache(ttl time.Duration) *Cache {
	return &Cache{
		entries: make(map[string]models.CatalogEntry),
		ttl:     ttl,
	}
}

// Set updates the cache with new entries
func (c *Cache) Set(entries []models.CatalogEntry) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries = make(map[string]models.CatalogEntry)
	for _, entry := range entries {
		key := models.CatalogKey(entry.SystemModelID, entry.ComponentType)
		// Keep the latest version if multiple exist
		if existing, ok := c.entries[key]; ok {
			if entry.Version > existing.Version {
				c.entries[key] = entry
			}
		} else {
			c.entries[key] = entry
		}
	}
	c.updatedAt = time.Now()
}

// GetLatestVersion returns the latest version for a model/component
func (c *Cache) GetLatestVersion(systemModel, componentType string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := models.CatalogKey(systemModel, componentType)
	if entry, ok := c.entries[key]; ok {
		return entry.Version, true
	}
	return "", false
}

// GetEntry returns the full catalog entry for a model/component
func (c *Cache) GetEntry(systemModel, componentType string) (models.CatalogEntry, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := models.CatalogKey(systemModel, componentType)
	entry, ok := c.entries[key]
	return entry, ok
}

// IsStale returns true if cache needs refresh
func (c *Cache) IsStale() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.updatedAt.IsZero() {
		return true
	}
	return time.Since(c.updatedAt) > c.ttl
}

// LastUpdated returns when the cache was last updated
func (c *Cache) LastUpdated() time.Time {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.updatedAt
}

// Count returns the number of entries in cache
func (c *Cache) Count() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.entries)
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
go test ./internal/catalog/... -v -run TestCache
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/catalog/
git commit -m "feat: add catalog cache with TTL support"
```

---

## Task 5: Catalog Service

**Files:**
- Create: `internal/catalog/service.go`
- Create: `internal/catalog/service_test.go`

**Step 1: Write test for catalog service**

Create `internal/catalog/service_test.go`:
```go
package catalog

import (
	"compress/gzip"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestService_Sync(t *testing.T) {
	mockXML := `<?xml version="1.0"?>
<Manifest version="2.0">
	<SoftwareComponent packageID="ABC123" releaseDate="2024-01-15"
		vendorVersion="2.19.1" path="FOLDER/BIOS.EXE" size="16777216">
		<Name><Display>BIOS Update</Display></Name>
		<ComponentType value="BIOS"/>
		<Criticality value="Recommended"/>
		<SupportedSystems>
			<Brand><Model systemID="08B4">PowerEdge R640</Model></Brand>
		</SupportedSystems>
	</SoftwareComponent>
</Manifest>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/gzip")
		gz := gzip.NewWriter(w)
		gz.Write([]byte(mockXML))
		gz.Close()
	}))
	defer server.Close()

	svc := NewService(server.URL, 1*time.Hour)

	err := svc.Sync(context.Background())
	if err != nil {
		t.Fatalf("sync error: %v", err)
	}

	version, found := svc.GetLatestVersion("PowerEdge R640", "BIOS")
	if !found {
		t.Fatal("expected to find BIOS entry")
	}
	if version != "2.19.1" {
		t.Errorf("expected version 2.19.1, got %s", version)
	}
}

func TestService_NeedsSync(t *testing.T) {
	svc := NewService("http://example.com", 100*time.Millisecond)

	if !svc.NeedsSync() {
		t.Error("new service should need sync")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/catalog/... -v -run TestService
```

Expected: FAIL - Service undefined

**Step 3: Write service implementation**

Create `internal/catalog/service.go`:
```go
package catalog

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

// Service manages catalog fetching, parsing, and caching
type Service struct {
	fetcher *Fetcher
	parser  *Parser
	cache   *Cache
}

// NewService creates a new catalog service
func NewService(catalogURL string, cacheTTL time.Duration) *Service {
	return &Service{
		fetcher: NewFetcher(catalogURL),
		parser:  NewParser(),
		cache:   NewCache(cacheTTL),
	}
}

// Sync fetches and parses the catalog
func (s *Service) Sync(ctx context.Context) error {
	log.Println("Syncing Dell firmware catalog...")

	data, err := s.fetcher.Fetch()
	if err != nil {
		return fmt.Errorf("fetch failed: %w", err)
	}

	entries, err := s.parser.Parse(data)
	if err != nil {
		return fmt.Errorf("parse failed: %w", err)
	}

	s.cache.Set(entries)
	log.Printf("Catalog synced: %d entries", s.cache.Count())

	return nil
}

// NeedsSync returns true if catalog needs refresh
func (s *Service) NeedsSync() bool {
	return s.cache.IsStale()
}

// GetLatestVersion returns the latest version for a model/component
func (s *Service) GetLatestVersion(systemModel, componentType string) (string, bool) {
	return s.cache.GetLatestVersion(systemModel, componentType)
}

// GetEntry returns the full catalog entry
func (s *Service) GetEntry(systemModel, componentType string) (models.CatalogEntry, bool) {
	return s.cache.GetEntry(systemModel, componentType)
}

// LastSynced returns when the catalog was last synced
func (s *Service) LastSynced() time.Time {
	return s.cache.LastUpdated()
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
go test ./internal/catalog/... -v -run TestService
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/catalog/
git commit -m "feat: add catalog service combining fetcher, parser, and cache"
```

---

## Task 6: Integrate Catalog with Poller

**Files:**
- Modify: `internal/poller/poller.go`
- Modify: `internal/poller/poller_test.go`

**Step 1: Update poller test**

Add to `internal/poller/poller_test.go`:
```go
func TestNewPollerWithCatalog(t *testing.T) {
	p := New(nil, nil, nil, nil, 30*time.Minute)
	if p == nil {
		t.Fatal("expected non-nil poller")
	}
}
```

**Step 2: Run test**

Run:
```bash
go test ./internal/poller/... -v
```

Expected: FAIL - wrong number of arguments

**Step 3: Update Poller struct to include catalog**

Modify `internal/poller/poller.go`:

First, update the imports:
```go
import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/catalog"
	"github.com/cragr/openshift-redfish-insights/internal/discovery"
	"github.com/cragr/openshift-redfish-insights/internal/models"
	"github.com/cragr/openshift-redfish-insights/internal/redfish"
	"github.com/cragr/openshift-redfish-insights/internal/store"
)
```

Update the Poller struct:
```go
// Poller periodically polls iDRACs for firmware inventory
type Poller struct {
	discoverer *discovery.Discoverer
	redfish    *redfish.Client
	store      *store.Store
	catalog    *catalog.Service
	interval   time.Duration

	mu      sync.Mutex
	running bool
	stopCh  chan struct{}
}

// New creates a new Poller
func New(discoverer *discovery.Discoverer, redfishClient *redfish.Client, store *store.Store, catalogSvc *catalog.Service, interval time.Duration) *Poller {
	return &Poller{
		discoverer: discoverer,
		redfish:    redfishClient,
		store:      store,
		catalog:    catalogSvc,
		interval:   interval,
	}
}
```

Update the poll function to sync catalog:
```go
func (p *Poller) poll(ctx context.Context) {
	log.Println("Starting firmware poll...")

	// Sync catalog if needed
	if p.catalog != nil && p.catalog.NeedsSync() {
		if err := p.catalog.Sync(ctx); err != nil {
			log.Printf("Catalog sync error: %v", err)
		}
	}

	hosts, err := p.discoverer.Discover(ctx)
	if err != nil {
		log.Printf("Discovery error: %v", err)
		return
	}

	log.Printf("Discovered %d hosts", len(hosts))

	var wg sync.WaitGroup
	for _, host := range hosts {
		wg.Add(1)
		go func(h discovery.DiscoveredHost) {
			defer wg.Done()
			p.pollHost(ctx, h)
		}(host)
	}
	wg.Wait()

	log.Println("Firmware poll complete")
}
```

Update pollHost to populate available versions:
```go
func (p *Poller) pollHost(ctx context.Context, host discovery.DiscoveredHost) {
	log.Printf("Polling %s at %s", host.Name, host.BMCAddress)

	firmware, nodeInfo, err := p.redfish.GetFirmwareInventory(
		ctx,
		host.BMCAddress,
		host.Credentials.Username,
		host.Credentials.Password,
	)

	node := models.Node{
		Name:        host.Name,
		BMCAddress:  host.BMCAddress,
		LastScanned: time.Now(),
	}

	if err != nil {
		log.Printf("Error polling %s: %v", host.Name, err)
		node.Status = models.StatusUnknown
		p.store.SetNode(node)
		return
	}

	if nodeInfo != nil {
		node.Model = nodeInfo.Model
		node.Manufacturer = nodeInfo.Manufacturer
		node.ServiceTag = nodeInfo.ServiceTag

		// Skip non-Dell hardware
		if !discovery.IsDellHardware(node.Manufacturer) {
			log.Printf("Skipping non-Dell hardware: %s (%s)", host.Name, node.Manufacturer)
			return
		}
	}

	// Enrich firmware with available versions from catalog
	if p.catalog != nil {
		for i := range firmware {
			if version, found := p.catalog.GetLatestVersion(node.Model, firmware[i].ComponentType); found {
				firmware[i].AvailableVersion = version
			}
		}
	}

	node.Firmware = firmware
	node.FirmwareCount = len(firmware)

	// Count updates available
	updatesNeeded := 0
	for _, fw := range firmware {
		if fw.NeedsUpdate() {
			updatesNeeded++
		}
	}
	node.UpdatesAvailable = updatesNeeded

	if updatesNeeded > 0 {
		node.Status = models.StatusNeedsUpdate
	} else {
		node.Status = models.StatusUpToDate
	}

	p.store.SetNode(node)
	log.Printf("Updated firmware inventory for %s: %d components, %d updates available", host.Name, len(firmware), updatesNeeded)
}
```

**Step 4: Run tests**

Run:
```bash
go test ./internal/poller/... -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add internal/poller/
git commit -m "feat: integrate catalog service with poller"
```

---

## Task 7: Add Updates API Endpoint

**Files:**
- Modify: `internal/api/handlers.go`
- Modify: `internal/api/handlers_test.go`
- Modify: `internal/api/server.go`

**Step 1: Write test for updates endpoint**

Add to `internal/api/handlers_test.go`:
```go
func TestListUpdatesHandler(t *testing.T) {
	s := store.New()
	s.SetNode(models.Node{
		Name:  "worker-0",
		Model: "PowerEdge R640",
		Firmware: []models.FirmwareComponent{
			{
				ID:               "BIOS",
				Name:             "BIOS",
				ComponentType:    "BIOS",
				CurrentVersion:   "2.18.1",
				AvailableVersion: "2.19.1",
			},
			{
				ID:               "iDRAC",
				Name:             "iDRAC",
				ComponentType:    "Firmware",
				CurrentVersion:   "6.10.00.00",
				AvailableVersion: "6.10.30.00",
			},
		},
	})
	s.SetNode(models.Node{
		Name:  "worker-1",
		Model: "PowerEdge R640",
		Firmware: []models.FirmwareComponent{
			{
				ID:               "BIOS",
				Name:             "BIOS",
				ComponentType:    "BIOS",
				CurrentVersion:   "2.18.1",
				AvailableVersion: "2.19.1",
			},
		},
	})

	srv := NewServer(s, ":8080")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/updates", nil)
	w := httptest.NewRecorder()

	srv.router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}

	var response struct {
		Updates []struct {
			ComponentType    string   `json:"componentType"`
			AvailableVersion string   `json:"availableVersion"`
			AffectedNodes    []string `json:"affectedNodes"`
		} `json:"updates"`
	}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(response.Updates) == 0 {
		t.Error("expected at least one update")
	}
}
```

**Step 2: Run test to verify it fails**

Run:
```bash
go test ./internal/api/... -v -run TestListUpdatesHandler
```

Expected: FAIL - route not found (404)

**Step 3: Add updates handler**

Add to `internal/api/handlers.go`:
```go
// UpdateSummary groups updates by component type
type UpdateSummary struct {
	ComponentType    string   `json:"componentType"`
	AvailableVersion string   `json:"availableVersion"`
	AffectedNodes    []string `json:"affectedNodes"`
	NodeCount        int      `json:"nodeCount"`
}

func (s *Server) listUpdates(w http.ResponseWriter, r *http.Request) {
	nodes := s.store.ListNodes()

	// Group updates by component type + version
	updateMap := make(map[string]*UpdateSummary)

	for _, node := range nodes {
		for _, fw := range node.Firmware {
			if !fw.NeedsUpdate() {
				continue
			}

			key := fw.ComponentType + "|" + fw.AvailableVersion
			if summary, ok := updateMap[key]; ok {
				summary.AffectedNodes = append(summary.AffectedNodes, node.Name)
				summary.NodeCount++
			} else {
				updateMap[key] = &UpdateSummary{
					ComponentType:    fw.ComponentType,
					AvailableVersion: fw.AvailableVersion,
					AffectedNodes:    []string{node.Name},
					NodeCount:        1,
				}
			}
		}
	}

	// Convert map to slice
	updates := make([]UpdateSummary, 0, len(updateMap))
	for _, summary := range updateMap {
		updates = append(updates, *summary)
	}

	response := map[string]interface{}{
		"updates": updates,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
```

**Step 4: Register route in server.go**

In `internal/api/server.go`, add the route:
```go
r.Route("/api/v1", func(r chi.Router) {
	r.Get("/nodes", srv.listNodes)
	r.Get("/nodes/{name}/firmware", srv.getNodeFirmware)
	r.Get("/updates", srv.listUpdates)  // Add this line
	r.Get("/health", srv.health)
})
```

**Step 5: Run tests**

Run:
```bash
go test ./internal/api/... -v
```

Expected: PASS

**Step 6: Commit**

```bash
git add internal/api/
git commit -m "feat: add /api/v1/updates endpoint for grouped update view"
```

---

## Task 8: Wire Catalog into Main

**Files:**
- Modify: `cmd/server/main.go`

**Step 1: Update main.go to create catalog service**

Add catalog configuration:
```go
// Get configuration from environment
addr := getEnv("LISTEN_ADDR", ":8080")
namespace := getEnv("WATCH_NAMESPACE", "openshift-machine-api")
pollInterval := getEnvDuration("POLL_INTERVAL", 30*time.Minute)
catalogURL := getEnv("CATALOG_URL", "https://downloads.dell.com/catalog/Catalog.xml.gz")
catalogTTL := getEnvDuration("CATALOG_TTL", 24*time.Hour)
```

Add import for catalog:
```go
"github.com/cragr/openshift-redfish-insights/internal/catalog"
```

Create catalog service:
```go
// Create components
dataStore := store.New()
redfishClient := redfish.NewClient()
catalogSvc := catalog.NewService(catalogURL, catalogTTL)
discoverer := discovery.NewDiscoverer(dynamicClient, kubeClient, namespace)
poll := poller.New(discoverer, redfishClient, dataStore, catalogSvc, pollInterval)
server := api.NewServer(dataStore, addr)
```

Update log message:
```go
log.Printf("Server ready - API: %s, Namespace: %s, Poll Interval: %v, Catalog TTL: %v", addr, namespace, pollInterval, catalogTTL)
```

**Step 2: Run go mod tidy**

Run:
```bash
go mod tidy
```

**Step 3: Verify build**

Run:
```bash
make build
```

Expected: Binary builds successfully

**Step 4: Run all tests**

Run:
```bash
make test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add cmd/server/main.go
git commit -m "feat: wire catalog service into main application"
```

---

## Task 9: Final Verification

**Step 1: Run full test suite**

Run:
```bash
make test
```

Expected: All tests pass

**Step 2: Build container**

Run:
```bash
podman build -t openshift-redfish-insights:dev .
```

Expected: Image builds successfully

**Step 3: Verify git status**

Run:
```bash
git status
git log --oneline
```

Expected: Clean working tree, series of commits for Phase 2

---

## Summary

Phase 2 implementation creates:
- Catalog data models (CatalogEntry)
- Fetcher to download gzipped Dell catalog
- Parser to extract firmware entries from XML
- Thread-safe cache with TTL
- Service combining fetch/parse/cache
- Poller integration to enrich firmware with available versions
- `/api/v1/updates` endpoint for grouped update view
- Main.go wiring with new configuration options

**Configuration:**
- `CATALOG_URL` - Dell catalog URL (default: https://downloads.dell.com/catalog/Catalog.xml.gz)
- `CATALOG_TTL` - How often to refresh catalog (default: 24h)

**Next Phase:** Console Plugin with PatternFly 6 UI
