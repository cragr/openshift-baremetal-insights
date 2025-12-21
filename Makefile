.PHONY: build run test clean

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

.DEFAULT_GOAL := build
