import express from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// ---- helpers ----
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---- middleware ----
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---- create short url ----
app.post("/api/shorten", (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const data = loadData();
  const id = nanoid(6);

  data[id] = url;
  saveData(data);

  res.json({
    shortUrl: `${req.protocol}://${req.get("host")}/${id}`
  });
});

// ---- redirect ----
app.get("/:id", (req, res) => {
  const data = loadData();
  const target = data[req.params.id];

  if (!target) {
    return res.status(404).send("URL not found");
  }

  res.redirect(target);
});

// ---- start server ----
app.listen(PORT, () => {
  console.log(`URL shortener running on http://localhost:${PORT}`);
});
