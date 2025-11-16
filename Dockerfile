FROM node:20-alpine
WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production

# Copy source
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
