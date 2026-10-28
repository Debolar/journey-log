# 1. Start from a small Node.js image
FROM node:24-alpine

# 2. Set the working directory inside the image
WORKDIR /app

# 3. Copy package.json and package-lock.json first
COPY package.json package-lock.json ./

# 4. Install production dependencies only
RUN npm ci --omit=dev

# 5. Copy the application code (the src folder)
COPY src ./src

# 6. Document the port the app listens on
EXPOSE 3000

# 7. Run as the non-root "node" user
USER node

# 7a. Let Docker check the app is healthy
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1

# 8. Start the app
CMD ["node", "src/server.js"]