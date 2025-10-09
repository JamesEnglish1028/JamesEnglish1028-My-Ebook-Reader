FROM node:20-alpine
WORKDIR /app
# Ensure curl and CA certificates are present so the proxy's curl fallback works
RUN apk add --no-cache curl ca-certificates
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "index.js"]
