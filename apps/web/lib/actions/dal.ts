"use server";

import { prisma } from "@tramus/db";

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
    where: {
      workspaceId: id,
    },
  });
}
