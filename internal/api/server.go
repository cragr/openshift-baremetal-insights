package api

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/cragr/openshift-baremetal-insights/internal/store"
)

// Server is the REST API server
type Server struct {
	store      *store.Store
	eventStore *store.EventStore
	router     *chi.Mux
	addr       string
	server     *http.Server
	certFile   string
	keyFile    string
}

// NewServer creates a new API server (backwards compatible)
func NewServer(s *store.Store, addr, certFile, keyFile string) *Server {
	return NewServerWithEvents(s, nil, addr, certFile, keyFile)
}

// NewServerWithEvents creates a new API server with event store
func NewServerWithEvents(s *store.Store, es *store.EventStore, addr, certFile, keyFile string) *Server {
	srv := &Server{
		store:      s,
		eventStore: es,
		addr:       addr,
		certFile:   certFile,
		keyFile:    keyFile,
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*"},
		AllowedMethods:   []string{"GET", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/nodes", srv.listNodes)
		r.Get("/nodes/{name}/firmware", srv.getNodeFirmware)
		r.Get("/nodes/{name}/health", srv.getNodeHealth)
		r.Get("/nodes/{name}/thermal", srv.getNodeThermal)
		r.Get("/nodes/{name}/power", srv.getNodePower)
		r.Get("/nodes/{name}/events", srv.getNodeEvents)
		r.Get("/updates", srv.listUpdates)
		r.Get("/events", srv.listEvents)
		r.Get("/health", srv.health)
		r.Get("/dashboard", srv.dashboard)
		r.Get("/namespaces", srv.listNamespaces)
	})

	r.Handle("/metrics", promhttp.Handler())
	r.HandleFunc("/healthz", healthzHandler)

	srv.router = r
	return srv
}

func healthzHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

// Start starts the HTTP server
func (s *Server) Start() error {
	s.server = &http.Server{
		Addr:         s.addr,
		Handler:      s.router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if s.certFile != "" && s.keyFile != "" {
		log.Printf("Starting API server on %s with TLS", s.addr)
		return s.server.ListenAndServeTLS(s.certFile, s.keyFile)
	}

	log.Printf("Starting API server on %s", s.addr)
	return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}
