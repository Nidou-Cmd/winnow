FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY bin ./bin
COPY src ./src
COPY public ./public
EXPOSE 3000
USER node
CMD ["node", "bin/server.mjs"]
