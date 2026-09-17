"use server";

import { prisma } from "@tramus/db";
export async function getUser(id: string) {
  const data = await prisma.user.findUnique({
    include: {
      name: true,
      posts: true,
    },
    where: {
      id: id,
    },
  });

  return data;
}

export async function getAllUser() {
  const data = await prisma.user.findMany({
    include: {
      posts: true,
    },
    where: {
      posts: {
        some: { published: true },
      },
    },
  });

  return data;
}
