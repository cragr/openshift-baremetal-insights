FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER 0
RUN chmod -R g+rwx /var/cache/nginx /var/run /var/log/nginx && \
    chown -R 1001:0 /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html
USER 1001

EXPOSE 9443

CMD ["nginx", "-g", "daemon off;"]
