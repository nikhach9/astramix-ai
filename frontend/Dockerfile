FROM node:18-alpine

WORKDIR /app

# Copy package lock and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the frontend source
COPY . .

# Set Next.js build-time environment variables
ENV NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Build Next.js app
RUN npm run build

EXPOSE 3000

# Start production server
CMD ["npm", "run", "start"]
