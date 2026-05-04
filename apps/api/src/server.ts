import { createServer } from "node:http";
import { env } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { redisConnection, scanQueue } from "./lib/queue";
import { logger } from "./lib/logger";

const server = createServer(createApp());

server.listen(env.port, () => {
  logger.info("TCG Monitor API listening.", { port: env.port, nodeEnv: env.nodeEnv });
});

async function shutdown(signal: string) {
  logger.info("Received shutdown signal; shutting down API gracefully.", { signal });
  const forceExit = setTimeout(() => {
    logger.error("API shutdown timed out; forcing exit.", { signal });
    process.exit(1);
  }, 10_000);
  forceExit.unref();
  server.close(async () => {
    try {
      await scanQueue.close();
      await redisConnection.quit();
      await prisma.$disconnect();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (error) {
      logger.error("API shutdown failed.", { error });
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
