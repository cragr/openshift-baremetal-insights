package store

import (
	"testing"
	"time"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

func TestEventStore_AddAndList(t *testing.T) {
	s := NewEventStore(100)

	event := models.HealthEvent{
		ID:        "1",
		Timestamp: time.Now(),
		Severity:  models.HealthCritical,
		Message:   "PSU failed",
		NodeName:  "worker-0",
	}

	s.AddEvent(event)
	events := s.ListEvents(10, "")

	if len(events) != 1 {
		t.Errorf("expected 1 event, got %d", len(events))
	}
	if events[0].Message != "PSU failed" {
		t.Errorf("expected message 'PSU failed', got %s", events[0].Message)
	}
}

func TestEventStore_FilterByNode(t *testing.T) {
	s := NewEventStore(100)

	s.AddEvent(models.HealthEvent{ID: "1", NodeName: "worker-0", Message: "Event 1"})
	s.AddEvent(models.HealthEvent{ID: "2", NodeName: "worker-1", Message: "Event 2"})
	s.AddEvent(models.HealthEvent{ID: "3", NodeName: "worker-0", Message: "Event 3"})

	events := s.ListEvents(10, "worker-0")

	if len(events) != 2 {
		t.Errorf("expected 2 events for worker-0, got %d", len(events))
	}
}

func TestEventStore_MaxSize(t *testing.T) {
	s := NewEventStore(2)

	s.AddEvent(models.HealthEvent{ID: "1", Message: "First"})
	s.AddEvent(models.HealthEvent{ID: "2", Message: "Second"})
	s.AddEvent(models.HealthEvent{ID: "3", Message: "Third"})

	events := s.ListEvents(10, "")

	if len(events) != 2 {
		t.Errorf("expected 2 events (max size), got %d", len(events))
	}
	// Oldest should be dropped
	for _, e := range events {
		if e.Message == "First" {
			t.Error("oldest event should have been dropped")
		}
	}
}
