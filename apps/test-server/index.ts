import path from "node:path";
import express from "express";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    message: "Server is running.",
    success: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/users", (req, res) => {
  res.json({ query: req.query, user: "AjayRajNegi" });
});

app.get("/pdf", (_req, res) => {
  const filePath = path.join(__dirname, "src", "AjayResume.pdf");
  res.setHeader("Content-Disposition", "attachment; filename=example.pdf");
  res.setHeader("Content-Type", "application/pdf");
  res.sendFile(filePath);
});

app.get("/posts/:id", (req, res) => {
  res.json({ params: req.params, user: "AjayRajNegi" });
});

app.listen(8080, () => {
  console.log("Server is running");
});
