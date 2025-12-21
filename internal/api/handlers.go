package api

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
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
