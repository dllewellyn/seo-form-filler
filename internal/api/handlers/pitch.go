package handlers

import (
	"encoding/json"
	"net/http"
)

func (h *Handlers) PitchDraft(w http.ResponseWriter, r *http.Request) {
	// TODO: Implement Pitch Agent
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotImplemented)
	json.NewEncoder(w).Encode(map[string]string{"error": "Not implemented"})
}
