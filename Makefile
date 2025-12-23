.PHONY: build run test clean lint plugin-build plugin-test images push helm-package helm-install all

BINARY_NAME=openshift-baremetal-insights
GO=go

# Image configuration
REGISTRY ?= quay.io/cragr
BACKEND_IMAGE ?= $(REGISTRY)/openshift-baremetal-insights
PLUGIN_IMAGE ?= $(REGISTRY)/openshift-baremetal-insights-plugin
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# Go targets
build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/server

run: build
	./bin/$(BINARY_NAME)

test:
	$(GO) test -v ./...

clean:
	rm -rf bin/
	rm -rf console-plugin/dist/
	rm -rf console-plugin/node_modules/

lint:
	golangci-lint run

# Plugin targets
plugin-build:
	cd console-plugin && npm ci && npm run build

plugin-test:
	cd console-plugin && npm test

# Image targets
image-backend:
	podman build -t $(BACKEND_IMAGE):$(VERSION) -t $(BACKEND_IMAGE):latest .

image-plugin:
	podman build -t $(PLUGIN_IMAGE):$(VERSION) -t $(PLUGIN_IMAGE):latest console-plugin/

images: image-backend image-plugin

push-backend:
	podman push $(BACKEND_IMAGE):$(VERSION)
	podman push $(BACKEND_IMAGE):latest

push-plugin:
	podman push $(PLUGIN_IMAGE):$(VERSION)
	podman push $(PLUGIN_IMAGE):latest

push: push-backend push-plugin

# Helm targets
helm-template:
	helm template baremetal-insights helm/openshift-baremetal-insights/

helm-package:
	helm package helm/openshift-baremetal-insights/

helm-install:
	helm upgrade --install baremetal-insights helm/openshift-baremetal-insights/ \
		--namespace baremetal-insights --create-namespace

helm-uninstall:
	helm uninstall baremetal-insights --namespace baremetal-insights

# Combined targets
all: build plugin-build

.DEFAULT_GOAL := build
