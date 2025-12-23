package api

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/cragr/openshift-baremetal-insights/internal/models"
)

func (s *Server) listNodes(w http.ResponseWriter, r *http.Request) {
	nodes := s.store.ListNodes()

	response := map[string]interface{}{
		"nodes": nodes,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func (s *Server) getNodeFirmware(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		if err := json.NewEncoder(w).Encode(map[string]string{"error": "node not found"}); err != nil {
			log.Printf("Failed to encode error response: %v", err)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(node); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok"}); err != nil {
		log.Printf("Failed to encode response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

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

func (s *Server) getNodeHealth(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	response := map[string]interface{}{
		"health":       node.Health,
		"healthRollup": node.HealthRollup,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodeThermal(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	response := map[string]interface{}{
		"thermal": node.ThermalSummary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodePower(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	node, ok := s.store.GetNode(name)
	if !ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "node not found"})
		return
	}

	response := map[string]interface{}{
		"power": node.PowerSummary,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) getNodeEvents(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	if s.eventStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"events": []interface{}{}})
		return
	}

	events := s.eventStore.ListEvents(50, name)

	response := map[string]interface{}{
		"events": events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) listEvents(w http.ResponseWriter, r *http.Request) {
	if s.eventStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"events": []interface{}{}})
		return
	}

	// Parse query params
	limitStr := r.URL.Query().Get("limit")
	limit := 100
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	nodeName := r.URL.Query().Get("node")

	events := s.eventStore.ListEvents(limit, nodeName)

	response := map[string]interface{}{
		"events": events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	namespace := r.URL.Query().Get("namespace")
	nodes := s.store.ListNodesByNamespace(namespace)

	stats := models.DashboardStats{
		TotalNodes:  len(nodes),
		LastRefresh: time.Now(),
		NextRefresh: time.Now().Add(30 * time.Minute),
	}

	// Health summary
	for _, node := range nodes {
		switch node.Health {
		case models.HealthOK:
			stats.HealthSummary.Healthy++
		case models.HealthWarning:
			stats.HealthSummary.Warning++
		case models.HealthCritical:
			stats.HealthSummary.Critical++
		}
	}

	// Power summary
	for _, node := range nodes {
		switch node.PowerState {
		case models.PowerOn:
			stats.PowerSummary.On++
		case models.PowerOff:
			stats.PowerSummary.Off++
		}
	}

	// Updates summary
	nodesWithUpdates := make(map[string]bool)
	for _, node := range nodes {
		for _, fw := range node.Firmware {
			if fw.NeedsUpdate() {
				stats.UpdatesSummary.Total++
				nodesWithUpdates[node.Name] = true
				switch fw.Severity {
				case models.SeverityCritical:
					stats.UpdatesSummary.Critical++
				case models.SeverityRecommended:
					stats.UpdatesSummary.Recommended++
				case models.SeverityOptional:
					stats.UpdatesSummary.Optional++
				}
			}
		}
	}
	stats.UpdatesSummary.NodesWithUpdates = len(nodesWithUpdates)

	// Jobs summary (placeholder - will be populated from TaskStore later)
	stats.JobsSummary = models.JobsSummary{}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (s *Server) listNamespaces(w http.ResponseWriter, r *http.Request) {
	namespaces := s.store.GetNamespaces()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"namespaces": namespaces,
	})
}

func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	if s.taskStore == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"tasks": []interface{}{}})
		return
	}

	namespace := r.URL.Query().Get("namespace")
	tasks := s.taskStore.ListTasks(namespace)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"tasks": tasks,
	})
}
