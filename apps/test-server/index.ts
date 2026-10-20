import express from "express";

const app = express();

app.use(express.json());

// app.use("/", (_req, res) => {
//   res.json({ message: "Hello" });
// });

app.get("/users", (_req, res) => {
  res.json({ user: "AjayRajNegi" });
});

app.get("/health", (_req, res) => {
  res.json({
    message: "Server is running.",
    success: true,
    timestamp: new Date().toISOString(),
  });
});

// app.get("/health", (_req, res) => {
//   res.json({
//     message: "Server is running.",
//   });
// });

app.listen(8080, () => {
  console.log("Server is running");
});
