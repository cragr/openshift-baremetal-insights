.PHONY: build run test clean lint plugin-build plugin-test plugin-image all

BINARY_NAME=openshift-redfish-insights
GO=go

build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/server

run: build
	./bin/$(BINARY_NAME)

test:
	$(GO) test -v ./...

clean:
	rm -rf bin/

lint:
	golangci-lint run

plugin-build:
	cd console-plugin && npm ci && npm run build

plugin-test:
	cd console-plugin && npm test

plugin-image:
	podman build -t redfish-insights-plugin:latest console-plugin/

all: build plugin-build

.DEFAULT_GOAL := build
