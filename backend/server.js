const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide" });
  }
}

app.get("/", (req, res) => {
  res.send("Backend Supabase OK 🚀");
});

/* AUTH */

app.post("/api/auth/register", async (req, res) => {
  const { nom, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe obligatoires" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          nom: nom || "",
          email,
          password: passwordHash,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, id: data.id });
  } catch (error) {
    res.status(500).json({ error: "Erreur création utilisateur" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "benevole",
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nom: user.nom || "",
      email: user.email,
      role: user.role || "benevole",
    },
  });
});

/* BENEFICIAIRES */

app.get("/api/beneficiaires", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("beneficiaires")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/api/beneficiaires", authMiddleware, async (req, res) => {
  const b = req.body;

  const { data, error } = await supabase
    .from("beneficiaires")
    .insert([
      {
        nom: b.nom || "",
        age: b.age || "",
        profil: b.profil || "",
        ville: b.ville || "",
        priorite: b.priorite || "",
        besoin: b.besoin || "",
        telephone: b.telephone || "",
        email: b.email || "",
        adresse: b.adresse || "",
        referent: b.referent || "",
        notes: b.notes || "",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erreur Supabase beneficiaires:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.put("/api/beneficiaires/:id", authMiddleware, async (req, res) => {
  const b = req.body;

  const { data, error } = await supabase
    .from("beneficiaires")
    .update({
      nom: b.nom || "",
      age: b.age || "",
      profil: b.profil || "",
      ville: b.ville || "",
      priorite: b.priorite || "",
      besoin: b.besoin || "",
      telephone: b.telephone || "",
      email: b.email || "",
      adresse: b.adresse || "",
      referent: b.referent || "",
      notes: b.notes || "",
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    console.error("Erreur update beneficiaire:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.delete("/api/beneficiaires/:id", authMiddleware, async (req, res) => {
  await supabase
    .from("actions")
    .delete()
    .eq("beneficiaire_id", req.params.id);

  const { error } = await supabase
    .from("beneficiaires")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Erreur delete beneficiaire:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

/* ACTIONS */

app.get("/api/beneficiaires/:id/actions", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("beneficiaire_id", req.params.id)
    .order("date", { ascending: false });

  if (error) {
    console.error("Erreur get actions:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/api/beneficiaires/:id/actions", authMiddleware, async (req, res) => {
  const a = req.body;

  const { data, error } = await supabase
    .from("actions")
    .insert([
      {
        beneficiaire_id: req.params.id,
        date: a.date || new Date().toISOString().slice(0, 10),
        type: a.type || "",
        description: a.description || "",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erreur add action:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});