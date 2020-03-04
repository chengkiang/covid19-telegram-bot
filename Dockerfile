FROM node:10-alpine

RUN mkdir -p /home/node/chatbot/node_modules && chown -R node:node /home/node/chatbot

WORKDIR /home/node/app

COPY package*.json ./

RUN npm ci

COPY . .

COPY --chown=node:node . .

USER node

EXPOSE 8080

CMD [ "node", "index.js" ]