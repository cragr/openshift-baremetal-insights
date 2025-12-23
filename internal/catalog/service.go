package catalog

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
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
