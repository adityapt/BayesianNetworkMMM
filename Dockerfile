# Multi-stage build for production deployment
FROM node:20-alpine AS builder

# Install Python and build dependencies
RUN apk add --no-cache python3 py3-pip build-base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pyproject.toml poetry.lock ./

# Install Python dependencies
RUN pip3 install poetry
RUN poetry config virtualenvs.create false
RUN poetry install --no-dev

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install Python runtime
RUN apk add --no-cache python3 py3-pip

# Create app directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# Copy Python environment
COPY --from=builder /usr/local/lib/python3.*/site-packages /usr/local/lib/python3.11/site-packages

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/models || exit 1

# Start the application
CMD ["node", "dist/index.js"]