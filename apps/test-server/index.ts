import express from "express";

const app = express();

app.use(express.json());

// app.use("/", (_req, res) => {
//   res.json({ message: "Hello" });
// });

app.get("/health", (_req, res) => {
  res.json({
    message: "Server is running.",
    success: true,
    timestamp: new Date().toISOString(),
  });
});

app.get("/users", (req, res) => {
  // const searchParam = req.query.search; // Accessing req.query
  res.json({ query: req.query, user: "AjayRajNegi" });
});

app.get("/posts/:id", (req, res) => {
  res.json({ params: req.params, user: "AjayRajNegi" });
});

app.listen(8080, () => {
  console.log("Server is running");
});
