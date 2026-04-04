import express from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// const PORT = 3000;
const DATA_FILE = path.join("/data", "data.json");
// create data file empty if not exist
if (!fs.existsSync(DATA_FILE)) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

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
  console.log("Received request to shorten URL");
  const { secret_one, env_one } = process.env;
  const { url } = req.body;
  console.log("Received URL:", url);
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
  console.log("Received request to redirect ID:", req.params.id);
  const data = loadData();
  const target = data[req.params.id];

  if (!target) {
    return res.status(404).send("URL not found");
  }

  res.redirect(target);
});
const port = process.env.ZIPUP_PORT;
// ---- start server ----
app.listen(port, () => {
  console.log(`URL shortener running on http://localhost:${port}`);
});
