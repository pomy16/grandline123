import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifySession } from "../services/auth";

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const session = verifySession(header.slice("Bearer ".length), env.jwtSecret, env.sessionTtlSeconds);
    if (session) {
      request.user = session;
    }
  }
  next();
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (!request.user) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}
