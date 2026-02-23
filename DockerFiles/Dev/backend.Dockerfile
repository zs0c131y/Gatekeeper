FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json* ./

RUN npm install

COPY backend/ .

EXPOSE 9000

CMD ["sh", "-c", "npm install && (sleep 5 && node /app/scripts/docker_auto_register.js &) && npm run dev"]
