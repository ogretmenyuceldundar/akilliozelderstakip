# Use an official Node runtime as a parent image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and lock files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --silent

# Copy the rest of the source code
COPY . .

# Build the React app (Vite)
RUN npm run build

# Production image, use nginx to serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Expose port 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
