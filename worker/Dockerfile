FROM node:20-slim

# Set root working dir
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install deps (tsx, etc.)
RUN npm install

# Copy everything else, including /src
COPY . .

# Start the worker using tsx from root
CMD ["npx", "tsx", "src/index.ts"]
