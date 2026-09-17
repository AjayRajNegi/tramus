import { prisma } from "@tramus/db";
import express from "express";

const app = express();

const PORT = 8000;

async function fetchUser() {
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

  if (!data || data.length === 0) {
    return { data: {}, success: false };
  }

  return { data, success: true };
}

app.get("/", async (req, res) => {
  try {
    const json = await fetchUser();

    if (!json.success) {
      res.status(401).send("Failed to fetch data");
    } else {
      console.log("Successfull");
      res.send(json.data).status(200);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
