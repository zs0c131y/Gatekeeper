FROM node:20-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the default port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
