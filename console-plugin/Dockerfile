FROM registry.access.redhat.com/ubi10/nodejs-22:latest AS builder

WORKDIR /app
USER root
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM registry.access.redhat.com/ubi10/nginx-126:latest

COPY --from=builder /app/dist /opt/app-root/src
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 9443

CMD ["nginx", "-g", "daemon off;"]
