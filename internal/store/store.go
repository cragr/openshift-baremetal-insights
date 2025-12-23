package store

import (
	"sync"

	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

// Store provides thread-safe in-memory storage for node firmware data
type Store struct {
	mu    sync.RWMutex
	nodes map[string]models.Node
}

// New creates a new Store
func New() *Store {
	return &Store{
		nodes: make(map[string]models.Node),
	}
}

// SetNode adds or updates a node in the store
func (s *Store) SetNode(node models.Node) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.nodes[node.Name] = node
}

// GetNode retrieves a node by name
func (s *Store) GetNode(name string) (models.Node, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	node, ok := s.nodes[name]
	return node, ok
}

// ListNodes returns all nodes
func (s *Store) ListNodes() []models.Node {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nodes := make([]models.Node, 0, len(s.nodes))
	for _, node := range s.nodes {
		nodes = append(nodes, node)
	}
	return nodes
}

// DeleteNode removes a node from the store
func (s *Store) DeleteNode(name string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.nodes, name)
}

// ListNodesByNamespace returns nodes, optionally filtered by namespace
func (s *Store) ListNodesByNamespace(namespace string) []models.Node {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nodes := make([]models.Node, 0, len(s.nodes))
	for _, node := range s.nodes {
		if namespace == "" || node.Namespace == namespace {
			nodes = append(nodes, node)
		}
	}
	return nodes
}

// GetNamespaces returns unique namespaces from stored nodes
func (s *Store) GetNamespaces() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nsMap := make(map[string]bool)
	for _, node := range s.nodes {
		if node.Namespace != "" {
			nsMap[node.Namespace] = true
		}
	}

	namespaces := make([]string, 0, len(nsMap))
	for ns := range nsMap {
		namespaces = append(namespaces, ns)
	}
	return namespaces
}
