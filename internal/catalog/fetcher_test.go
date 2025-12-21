package catalog

import (
	"compress/gzip"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetcher_Fetch(t *testing.T) {
	// Create a mock server that returns gzipped XML
	mockXML := `<?xml version="1.0"?>
<Manifest version="2.0">
	<SoftwareComponent>
		<ComponentType value="BIOS"/>
		<SupportedSystems>
			<Brand><Model systemID="ABC123">PowerEdge R640</Model></Brand>
		</SupportedSystems>
	</SoftwareComponent>
</Manifest>`

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/gzip")
		gz := gzip.NewWriter(w)
		gz.Write([]byte(mockXML))
		gz.Close()
	}))
	defer server.Close()

	fetcher := NewFetcher(server.URL)
	data, err := fetcher.Fetch()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(string(data), "PowerEdge R640") {
		t.Error("expected data to contain PowerEdge R640")
	}
}

func TestFetcher_FetchError(t *testing.T) {
	fetcher := NewFetcher("http://invalid.localhost:99999")
	_, err := fetcher.Fetch()
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}
