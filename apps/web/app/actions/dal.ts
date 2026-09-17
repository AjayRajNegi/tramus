"use server";

import { prisma } from "@tramus/db";
export async function getUser(id: string) {
	const data = await prisma.user.findUnique({
		where: {
			id: id,
		},
		include: {
			name: true,
			posts: true,
		},
	});

	return data;
}

export async function getAllUser() {
	const data = await prisma.user.findMany({
		where: {
			posts: {
				some: { published: true },
			},
		},
		include: {
			posts: true,
		},
	});

	return data;
}
