import { createServer } from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { redisConnection, scanQueue } from "./lib/queue";

const server = createServer(createApp());

server.listen(env.port, () => {
  console.log(`TCG Monitor API listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down API gracefully.`);
  server.close(async () => {
    await scanQueue.close();
    await redisConnection.quit();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
