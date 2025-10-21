# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --base-href /angular2/ --deploy-url /angular2/

# Run stage
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist/angular2/browser ./angular2
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4202
