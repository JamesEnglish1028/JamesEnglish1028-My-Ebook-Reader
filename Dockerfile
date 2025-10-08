# Fallback Dockerfile at repo root to build the proxy service
# This simply builds the proxy using the proxy/ folder as source.
FROM node:20-alpine
WORKDIR /app
COPY proxy/package*.json ./
RUN npm ci --production
# Copy everything from the proxy folder into the container
COPY proxy/ ./
EXPOSE 8080
CMD ["node", "index.js"]
