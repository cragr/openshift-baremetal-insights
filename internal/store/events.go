package store

import (
	"sort"
	"sync"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

// EventStore provides thread-safe storage for health events
type EventStore struct {
	mu      sync.RWMutex
	events  []models.HealthEvent
	maxSize int
}

// NewEventStore creates a new EventStore with max capacity
func NewEventStore(maxSize int) *EventStore {
	return &EventStore{
		events:  make([]models.HealthEvent, 0),
		maxSize: maxSize,
	}
}

// AddEvent adds an event to the store
func (s *EventStore) AddEvent(event models.HealthEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append(s.events, event)

	// Trim to max size, keeping newest
	if len(s.events) > s.maxSize {
		s.events = s.events[len(s.events)-s.maxSize:]
	}
}

// AddEvents adds multiple events to the store
func (s *EventStore) AddEvents(nodeName string, events []models.HealthEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, e := range events {
		e.NodeName = nodeName
		s.events = append(s.events, e)
	}

	// Trim to max size
	if len(s.events) > s.maxSize {
		s.events = s.events[len(s.events)-s.maxSize:]
	}
}

// ListEvents returns events, optionally filtered by node
func (s *EventStore) ListEvents(limit int, nodeName string) []models.HealthEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.HealthEvent, 0)

	for _, e := range s.events {
		if nodeName != "" && e.NodeName != nodeName {
			continue
		}
		result = append(result, e)
	}

	// Sort by timestamp descending (newest first)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Timestamp.After(result[j].Timestamp)
	})

	if limit > 0 && len(result) > limit {
		result = result[:limit]
	}

	return result
}
