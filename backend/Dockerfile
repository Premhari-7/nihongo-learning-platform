# Stage 1: Build & Install dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Stage 2: Production runtime
FROM node:18-alpine AS production

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Security: Set up non-root user
RUN chown -R node:node /app
USER node

# Copy dependencies and application from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app ./

EXPOSE 5000

CMD ["npm", "start"]
