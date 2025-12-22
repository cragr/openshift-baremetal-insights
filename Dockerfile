FROM golang:1.24-alpine AS builder

WORKDIR /app
ENV GOTOOLCHAIN=auto
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /openshift-redfish-insights ./cmd/server

FROM registry.access.redhat.com/ubi9/ubi-minimal:latest
RUN microdnf install -y ca-certificates && microdnf clean all
COPY --from=builder /openshift-redfish-insights /openshift-redfish-insights

USER 1001

ENTRYPOINT ["/openshift-redfish-insights"]
