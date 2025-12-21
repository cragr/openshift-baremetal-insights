// internal/metrics/metrics_test.go
package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestRecordScan(t *testing.T) {
	// Reset counter for test isolation
	FirmwareScanTotal.Reset()

	RecordScan("worker-0", true)
	RecordScan("worker-0", true)
	RecordScan("worker-1", false)

	// Check worker-0 success count
	count := testutil.ToFloat64(FirmwareScanTotal.WithLabelValues("worker-0", "success"))
	if count != 2 {
		t.Errorf("expected 2, got %f", count)
	}

	// Check worker-1 error count
	count = testutil.ToFloat64(FirmwareScanTotal.WithLabelValues("worker-1", "error"))
	if count != 1 {
		t.Errorf("expected 1, got %f", count)
	}
}
