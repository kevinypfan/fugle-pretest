# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

ENV RL_TTL=60
ENV RL_LIMIT_ID=5
ENV RL_LIMIT_IP=10
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
# RUN npm install glob rimraf
RUN npm install --legacy-peer-deps

EXPOSE 3000
# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

# Start the server using the production build
CMD [ "npm", "run", "start" ]
