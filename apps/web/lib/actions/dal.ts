"use server";

import { prisma } from "@tramus/db";

export async function getUser(id: string) {
  const data = await prisma.user.findUnique({
    include: {
      posts: true,
    },
    where: {
      id: id,
    },
  });

  return data;
}

export async function getAllUser() {
  return await prisma.user.findMany({
    select: {
      email: true,
      id: true,
      name: true,
      posts: {
        select: {
          content: true,
          id: true,
          title: true,
        },
        where: {
          published: true,
        },
      },
    },
    where: {
      posts: {
        some: {
          published: true,
        },
      },
    },
  });
}
