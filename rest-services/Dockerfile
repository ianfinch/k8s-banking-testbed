FROM node:alpine
ARG REST_SERVICE
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
COPY rest.js ./
COPY ${REST_SERVICE} ./index.js

EXPOSE 3000
CMD [ "node", "index.js" ]
