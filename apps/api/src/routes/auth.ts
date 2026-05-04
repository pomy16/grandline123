import { Router } from "express";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { signSession, verifyPassword } from "../services/auth";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", async (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };
  if (!email || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    response.status(401).json({ error: "Invalid credentials." });
    return;
  }

  response.json({
    token: signSession({ userId: user.id, email: user.email }, env.jwtSecret),
    user: { id: user.id, email: user.email, name: user.name }
  });
});

authRouter.post("/logout", (_request, response) => {
  response.status(204).send();
});

authRouter.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user!.userId },
    select: { id: true, email: true, name: true }
  });

  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  response.json({ data: user });
});
