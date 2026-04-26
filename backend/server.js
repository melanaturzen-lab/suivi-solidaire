const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// 🔗 Connexion Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// ROUTE TEST
// =========================
app.get("/", (req, res) => {
  res.send("Backend Supabase OK 🚀");
});

// =========================
// REGISTER
// =========================
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password: hash }]);

  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: "Utilisateur créé" });
});

// =========================
// LOGIN
// =========================
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const valid = await bcrypt.compare(password, data.password);

  if (!valid) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const token = jwt.sign({ id: data.id }, JWT_SECRET);

  res.json({ token });
});

// =========================
// START
// =========================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur le port " + PORT);
});