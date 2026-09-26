"use server";

import { HttpMethod, prisma } from "@tramus/db";

// export async function getUser(id: string) {
//   const data = await prisma.user.findUnique({
//     include: {
//       posts: true,
//     },
//     where: {
//       id: id,
//     },
//   });

//   return data;
// }

// export async function getAllUser() {
//   return await prisma.user.findMany({
//     select: {
//       email: true,
//       id: true,
//       name: true,
//       posts: {
//         select: {
//           content: true,
//           id: true,
//           title: true,
//         },
//         where: {
//           published: true,
//         },
//       },
//     },
//     where: {
//       posts: {
//         some: {
//           published: true,
//         },
//       },
//     },
//   });
// }

// export async function getAllPosts() {
//   return await prisma.post.findMany({
//     select: {
//       content: true,
//       id: true,
//       title: true,
//     },
//     where: {
//       published: true,
//     },
//   });
// }

export async function getWorkspaces() {
  return await prisma.workspace.findMany({
    where: {
      ownerId: "33923283-a008-4e53-8b97-b11be654f1d9",
    },
  });
}

export async function getScenarios(id: string) {
  return await prisma.scenario.findMany({
    include: {
      endpoints: true,
    },
    where: {
      workspaceId: id,
    },
  });
}

export async function getEndpoints(id: string) {
  return await prisma.endpoint.findMany({
    where: {
      scenarioId: id,
    },
  });
}

export async function getEndpointsData(id: string) {
  return await prisma.endpoint.findFirst({
    select: {
      method: true,
      path: true,
      responseBody: true,
      responseHeaders: true,
      responseStatus: true,
    },
    where: {
      id,
    },
  });
}

export async function createWorkspace({ name }: { name: string }) {
  return prisma.$transaction(async (tx) => {
    const workspace = tx.workspace.create({
      data: {
        name,
        ownerId: "33923283-a008-4e53-8b97-b11be654f1d9",
      },
    });

    const scenario = tx.scenario.create({
      data: {
        name: "main",
        workspaceId: (await workspace).id,
      },
    });

    // TODO: Remove auto endpoint creation
    await tx.endpoint.create({
      data: {
        method: HttpMethod.GET,
        path: "https://www.google.com",
        scenarioId: (await scenario).id,
        workspaceId: (await workspace).id,
      },
    });

    return {
      createdAt: (await workspace).createdAt,
      id: (await workspace).id,
      name: (await workspace).name,
      ownerId: (await workspace).ownerId,
    };
  });
}
