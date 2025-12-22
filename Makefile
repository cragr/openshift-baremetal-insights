.PHONY: build run test clean lint plugin-build plugin-test images push helm-package helm-install all

BINARY_NAME=openshift-redfish-insights
GO=go

# Image configuration
REGISTRY ?= quay.io/cragr
BACKEND_IMAGE ?= $(REGISTRY)/openshift-redfish-insights
PLUGIN_IMAGE ?= $(REGISTRY)/redfish-insights-plugin
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
	helm template redfish-insights helm/openshift-redfish-insights/

helm-package:
	helm package helm/openshift-redfish-insights/

helm-install:
	helm upgrade --install redfish-insights helm/openshift-redfish-insights/ \
		--namespace redfish-insights --create-namespace

helm-uninstall:
	helm uninstall redfish-insights --namespace redfish-insights

# Combined targets
all: build plugin-build

.DEFAULT_GOAL := build
