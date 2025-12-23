FROM registry.access.redhat.com/ubi10/go-toolset:latest AS builder

WORKDIR /app
USER root
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /openshift-baremetal-insights ./cmd/server

FROM registry.access.redhat.com/ubi10-minimal:latest
RUN microdnf install -y ca-certificates && microdnf clean all
COPY --from=builder /openshift-baremetal-insights /openshift-baremetal-insights

USER 1001

ENTRYPOINT ["/openshift-baremetal-insights"]
