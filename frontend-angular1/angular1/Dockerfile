# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# IMPORTANT: build for the subpath
RUN npm run build -- --base-href /angular1/ --deploy-url /angular1/

# Run stage
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
# Copy the build into a subfolder named "angular1"
COPY --from=build /app/dist/angular1/browser ./angular1
# Replace default nginx config with SPA-aware config for /angular1/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4201
