# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Run
FROM node:20-alpine AS run
WORKDIR /app
RUN apk --no-cache upgrade && apk --no-cache add ca-certificates
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
USER node
CMD ["npm", "run", "start"]
