import express from "express";

const app = express();

app.use(express.json());

app.use("/", (_req, res) => {
  res.json({ message: "Hello" });
});

app.listen(8080, () => {
  console.log("Server is running");
});
