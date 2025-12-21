package poller

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/catalog"
	"github.com/cragr/openshift-redfish-insights/internal/discovery"
	"github.com/cragr/openshift-redfish-insights/internal/metrics"
	"github.com/cragr/openshift-redfish-insights/internal/models"
	"github.com/cragr/openshift-redfish-insights/internal/redfish"
	"github.com/cragr/openshift-redfish-insights/internal/store"
)

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

// Start begins the polling loop
func (p *Poller) Start(ctx context.Context) {
	p.mu.Lock()
	if p.running {
		p.mu.Unlock()
		return
	}
	p.running = true
	p.stopCh = make(chan struct{})
	p.mu.Unlock()

	// Run immediately on start
	p.poll(ctx)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-p.stopCh:
			return
		case <-ticker.C:
			p.poll(ctx)
		}
	}
}

// Stop stops the polling loop
func (p *Poller) Stop() {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.running {
		close(p.stopCh)
		p.running = false
	}
}

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
		metrics.RecordScan(node.Name, false)
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

	// Count updates available (will be populated when catalog is integrated)
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
	metrics.RecordScan(node.Name, true)
	log.Printf("Updated firmware inventory for %s: %d components", host.Name, len(firmware))
}
