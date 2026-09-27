"use server";

import { prisma } from "@tramus/db";

const ownerId = "33923283-a008-4e53-8b97-b11be654f1d9";

const workspaceSelect = {
  id: true,
  name: true,
  ownerId: true,
} as const;

const endpointSelect = {
  id: true,
  method: true,
  path: true,
  responseBody: true,
  responseHeaders: true,
  responseStatus: true,
  scenarioId: true,
} as const;

export async function getWorkspaces() {
  return prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: workspaceSelect,
    where: { ownerId },
  });
}

export async function getScenarios(workspaceId: string) {
  return prisma.scenario.findMany({
    select: {
      _count: {
        select: {
          endpoints: true,
        },
      },
      endpoints: {
        select: {
          id: true,
          method: true,
          path: true,
        },
      },
      id: true,
      name: true,
      workspaceId: true,
    },
    where: { workspaceId },
  });
}

export async function getEndpoints(scenarioId: string) {
  return prisma.endpoint.findMany({
    select: endpointSelect,
    where: { scenarioId },
  });
}

export async function getEndpoint(endpointId: string) {
  return prisma.endpoint.findFirst({
    select: endpointSelect,
    where: { id: endpointId },
  });
}

export async function createWorkspace({ name }: { name: string }) {
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, ownerId },
      select: workspaceSelect,
    });

    await tx.scenario.create({
      data: { name: "main", workspaceId: workspace.id },
    });

    return workspace;
  });
}
