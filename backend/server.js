require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// ✅ FIX SUPABASE
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("URL:", SUPABASE_URL);
console.log("KEY:", SUPABASE_KEY ? "OK" : "MANQUANTE");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Supabase mal configuré !");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= MULTER =================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ================= AUTH MIDDLEWARE =================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token manquant" });

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

// ================= TEST =================
app.get("/", (req, res) => {
  res.send("Backend OK 🚀");
});

// ================= ATELIERS (SANS AUTH POUR TON FRONT) =================
app.get("/ateliers", async (req, res) => {
  const { data, error } = await supabase
    .from("ateliers")
    .select("*, atelier_participants(*, beneficiaires(id, nom))")
    .order("date", { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ================= ATELIERS (API COMPLET AVEC AUTH) =================
app.get("/api/ateliers", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("ateliers")
    .select("*, atelier_participants(*, beneficiaires(id, nom))")
    .order("date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/ateliers", authMiddleware, async (req, res) => {
  const a = req.body;

  const { data, error } = await supabase
    .from("ateliers")
    .insert([{
      titre: a.titre || "",
      date: a.date || "",
      lieu: a.lieu || "",
      intervenant: a.intervenant || "",
      description: a.description || "",
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put("/api/ateliers/:id", authMiddleware, async (req, res) => {
  const a = req.body;

  const { data, error } = await supabase
    .from("ateliers")
    .update({
      titre: a.titre || "",
      date: a.date || "",
      lieu: a.lieu || "",
      intervenant: a.intervenant || "",
      description: a.description || "",
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/ateliers/:id/participants", authMiddleware, async (req, res) => {
  const { beneficiaire_id } = req.body;

  const { data, error } = await supabase
    .from("atelier_participants")
    .insert([{
      atelier_id: req.params.id,
      beneficiaire_id,
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.delete("/api/ateliers/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("ateliers")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ================= START =================
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});