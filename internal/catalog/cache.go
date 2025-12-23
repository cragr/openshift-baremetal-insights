package catalog

import (
	"sync"
	"time"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
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
