package store

import (
	"testing"
	"time"

	"github.com/cragr/openshift-redfish-insights/internal/models"
)

func TestStore_SetAndGetNode(t *testing.T) {
	s := New()

	node := models.Node{
		Name:        "worker-0",
		BMCAddress:  "192.168.1.100",
		Model:       "PowerEdge R640",
		LastScanned: time.Now(),
		Status:      models.StatusUpToDate,
	}

	s.SetNode(node)

	got, ok := s.GetNode("worker-0")
	if !ok {
		t.Fatal("expected to find node")
	}

	if got.Name != node.Name {
		t.Errorf("expected name %s, got %s", node.Name, got.Name)
	}
}

func TestStore_ListNodes(t *testing.T) {
	s := New()

	s.SetNode(models.Node{Name: "worker-0"})
	s.SetNode(models.Node{Name: "worker-1"})

	nodes := s.ListNodes()
	if len(nodes) != 2 {
		t.Errorf("expected 2 nodes, got %d", len(nodes))
	}
}

func TestStore_DeleteNode(t *testing.T) {
	s := New()

	s.SetNode(models.Node{Name: "worker-0"})
	s.DeleteNode("worker-0")

	_, ok := s.GetNode("worker-0")
	if ok {
		t.Error("expected node to be deleted")
	}
}
