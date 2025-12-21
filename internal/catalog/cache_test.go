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
