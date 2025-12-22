FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM registry.access.redhat.com/ubi9/nginx-122:latest

COPY --from=builder /app/dist /opt/app-root/src
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 9443

CMD ["nginx", "-g", "daemon off;"]
