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

app.post("/upload", upload.any(), (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).json({
        message: "No files uploaded.",
        success: false,
      });
    }

    const files = req.files;
    const fileNames = files.map((file) => file.originalname);
    const filePaths = files.map((file) => file.path);

    res.json({
      fileNames,
      filePaths,
      message: "Files uploaded successfully",
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "An error occurred while uploading files.",
      success: false,
    });
  }
});

app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
