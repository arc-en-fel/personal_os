# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy app code
COPY . .

# Build (if needed)
RUN npm run typecheck || true

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install expo-cli globally
RUN npm install -g expo-cli

# Copy from builder
COPY --from=builder /app .

# Set NODE_ENV to production
ENV NODE_ENV=production

# Expose port (Railway will assign)
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start expo server
CMD ["expo", "start", "--web", "--host", "0.0.0.0"]
