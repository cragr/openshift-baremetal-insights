// internal/metrics/metrics.go
package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// FirmwareScanTotal counts firmware scan operations per node
	FirmwareScanTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "firmware_scan_total",
			Help: "Total number of firmware scan operations",
		},
		[]string{"node", "status"},
	)
)

// RecordScan increments the scan counter for a node
func RecordScan(node string, success bool) {
	status := "success"
	if !success {
		status = "error"
	}
	FirmwareScanTotal.WithLabelValues(node, status).Inc()
}
