package catalog

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Fetcher downloads catalog files from a URL
type Fetcher struct {
	url    string
	client *http.Client
}

// NewFetcher creates a new catalog fetcher
func NewFetcher(url string) *Fetcher {
	return &Fetcher{
		url: url,
		client: &http.Client{
			Timeout: 5 * time.Minute, // Catalog can be large
		},
	}
}

// Fetch downloads and decompresses the catalog
func (f *Fetcher) Fetch() ([]byte, error) {
	resp, err := f.client.Get(f.url)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch catalog: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("catalog fetch returned status %d", resp.StatusCode)
	}

	// Check if response is gzipped
	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Type") == "application/gzip" ||
		resp.Header.Get("Content-Encoding") == "gzip" ||
		len(f.url) > 3 && f.url[len(f.url)-3:] == ".gz" {
		gzReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzReader.Close()
		reader = gzReader
	}

	data, err := io.ReadAll(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to read catalog: %w", err)
	}

	return data, nil
}
