# Use an Alpine-based image with Node.js
FROM node:20-alpine

# Install PM2
RUN npm install -g pm2

# Add necessary packages for Puppeteer
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Set Puppeteer-related environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Step 2: Set the working directory in the container
WORKDIR /usr/src/app

# Step 3: Copy the package.json files from your local machine into the container
COPY package*.json ./

# Step 4: Install any dependencies
RUN npm install

# Step 5: Bundle your app's source code inside the Docker image
COPY . .

# Step 6: Build your NestJS application for production
RUN npm run build

# Step 7: Make port 3000 available to the world outside this container
EXPOSE 3000

# Step 8: Define the command to run your app
CMD ["node", "dist/main"]
# CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
