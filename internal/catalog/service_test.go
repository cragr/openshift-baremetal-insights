package catalog

import (
	"compress/gzip"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestService_Sync(t *testing.T) {
	mockXML := `<?xml version="1.0"?>
<Manifest version="2.0">
	<SoftwareComponent packageID="ABC123" releaseDate="2024-01-15"
		vendorVersion="2.19.1" path="FOLDER/BIOS.EXE" size="16777216">
		<Name><Display>BIOS Update</Display></Name>
		<ComponentType value="BIOS"/>
		<Criticality value="Recommended"/>
		<SupportedSystems>
			<Brand><Model systemID="08B4">PowerEdge R640</Model></Brand>
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

	svc := NewService(server.URL, 1*time.Hour)

	err := svc.Sync(context.Background())
	if err != nil {
		t.Fatalf("sync error: %v", err)
	}

	version, found := svc.GetLatestVersion("PowerEdge R640", "BIOS")
	if !found {
		t.Fatal("expected to find BIOS entry")
	}
	if version != "2.19.1" {
		t.Errorf("expected version 2.19.1, got %s", version)
	}
}

func TestService_NeedsSync(t *testing.T) {
	svc := NewService("http://example.com", 100*time.Millisecond)

	if !svc.NeedsSync() {
		t.Error("new service should need sync")
	}
}
