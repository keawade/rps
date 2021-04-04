FROM node:14.16.0-alpine as build

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN find . -path ./node_modules -type f

USER node
EXPOSE 3000

CMD ["node", "build/server.js"]

