FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json apps/api/
COPY apps/worker/package*.json apps/worker/
COPY apps/web/package*.json apps/web/
COPY packages/shared/package*.json packages/shared/
RUN npm install
COPY . .
RUN npm run prisma:generate
RUN npm run build -w packages/shared && npm run build -w apps/worker
CMD ["npm", "run", "start", "-w", "apps/worker"]
