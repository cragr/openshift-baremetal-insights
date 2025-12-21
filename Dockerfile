FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /openshift-redfish-insights ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
COPY --from=builder /openshift-redfish-insights /openshift-redfish-insights

ENTRYPOINT ["/openshift-redfish-insights"]
