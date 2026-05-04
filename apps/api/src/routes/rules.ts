import { Router } from "express";
import { prisma } from "../lib/prisma";

export const rulesRouter = Router();

rulesRouter.get("/", async (_request, response) => {
  const rules = await prisma.keywordRule.findMany({ orderBy: { createdAt: "desc" } });
  response.json({ data: rules });
});

rulesRouter.post("/", async (request, response) => {
  const rule = await prisma.keywordRule.create({ data: request.body });
  response.status(201).json({ data: rule });
});

rulesRouter.patch("/:id", async (request, response) => {
  const rule = await prisma.keywordRule.update({ where: { id: request.params.id }, data: request.body });
  response.json({ data: rule });
});

rulesRouter.delete("/:id", async (request, response) => {
  await prisma.keywordRule.delete({ where: { id: request.params.id } });
  response.status(204).send();
});
