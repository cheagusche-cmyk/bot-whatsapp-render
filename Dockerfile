FROM ghcr.io/puppeteer/puppeteer:21.5.2

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD [ "node", "index.js" ]

