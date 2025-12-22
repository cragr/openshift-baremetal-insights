package poller

import (
	"testing"
	"time"
)

func TestNewPoller(t *testing.T) {
	p := New(nil, nil, nil, nil, nil, 30*time.Minute)
	if p == nil {
		t.Fatal("expected non-nil poller")
	}

	if p.interval != 30*time.Minute {
		t.Errorf("expected interval 30m, got %v", p.interval)
	}
}

func TestNewPollerWithCatalog(t *testing.T) {
	p := New(nil, nil, nil, nil, nil, 30*time.Minute)
	if p == nil {
		t.Fatal("expected non-nil poller")
	}
}
