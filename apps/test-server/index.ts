import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const upload = multer({
  dest: path.join(__dirname, "src"),
});

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

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No file uploaded. Please ensure the field name is 'file'.",
      success: false,
    });
  }

  const fileName = req.file.originalname;
  const filePath = req.file.path;

  res.json({
    filePath,
    message: `File uploaded successfully: ${fileName}`,
    success: true,
  });
});

app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
