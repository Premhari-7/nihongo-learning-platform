# Stage 1: Build Expo Web App
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the web bundle (outputs to 'dist')
RUN npx expo export

# Stage 2: Production Nginx Server
FROM nginx:alpine AS production

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the generated web build from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
