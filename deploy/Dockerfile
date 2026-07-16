# AFH runtime host — production image (RC4)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
RUN npm ci
RUN npm run build -w @afh/runtime-host

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV AFH_PROFILE=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/node_modules ./node_modules
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health/live || exit 1
CMD ["node", "packages/runtime-host/dist/bin/main.js"]
