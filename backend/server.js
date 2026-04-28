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
          role: "benevole",
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Erreur register:", error);
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
    console.error("Erreur get beneficiaires:", error);
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
    console.error("Erreur add beneficiaire:", error);
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
  const id = req.params.id;

  await supabase.from("actions").delete().eq("beneficiaire_id", id);
  await supabase.from("entretiens").delete().eq("beneficiaire_id", id);
  await supabase.from("dossiers_instruction").delete().eq("beneficiaire_id", id);

  const { error } = await supabase
    .from("beneficiaires")
    .delete()
    .eq("id", id);

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
    .order("created_at", { ascending: false });

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

app.delete("/api/actions/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("actions")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Erreur delete action:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

/* ACCOMPAGNEMENT - ENTRETIENS */

app.get("/api/entretiens", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("entretiens")
    .select(`
      *,
      beneficiaires (
        id,
        nom,
        ville
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur get entretiens:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/api/beneficiaires/:id/entretiens", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("entretiens")
    .select("*")
    .eq("beneficiaire_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur get entretiens beneficiaire:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/api/entretiens", authMiddleware, async (req, res) => {
  const e = req.body;

  if (!e.beneficiaire_id) {
    return res.status(400).json({ error: "beneficiaire_id obligatoire" });
  }

  const { data, error } = await supabase
    .from("entretiens")
    .insert([
      {
        beneficiaire_id: e.beneficiaire_id,
        date: e.date || new Date().toISOString().slice(0, 10),
        type: e.type || "",
        compte_rendu: e.compte_rendu || "",
        suite_a_donner: e.suite_a_donner || "",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erreur add entretien:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.put("/api/entretiens/:id", authMiddleware, async (req, res) => {
  const e = req.body;

  const { data, error } = await supabase
    .from("entretiens")
    .update({
      date: e.date || "",
      type: e.type || "",
      compte_rendu: e.compte_rendu || "",
      suite_a_donner: e.suite_a_donner || "",
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    console.error("Erreur update entretien:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.delete("/api/entretiens/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("entretiens")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Erreur delete entretien:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

/* ACCOMPAGNEMENT - DOSSIERS D'INSTRUCTION */

app.get("/api/dossiers-instruction", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("dossiers_instruction")
    .select(`
      *,
      beneficiaires (
        id,
        nom,
        ville
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur get dossiers:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.get("/api/beneficiaires/:id/dossiers-instruction", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("dossiers_instruction")
    .select("*")
    .eq("beneficiaire_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur get dossiers beneficiaire:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/api/dossiers-instruction", authMiddleware, async (req, res) => {
  const d = req.body;

  if (!d.beneficiaire_id) {
    return res.status(400).json({ error: "beneficiaire_id obligatoire" });
  }

  const { data, error } = await supabase
    .from("dossiers_instruction")
    .insert([
      {
        beneficiaire_id: d.beneficiaire_id,
        type: d.type || "",
        statut: d.statut || "Ouvert",
        date_ouverture: d.date_ouverture || new Date().toISOString().slice(0, 10),
        echeance: d.echeance || "",
        notes: d.notes || "",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Erreur add dossier:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.put("/api/dossiers-instruction/:id", authMiddleware, async (req, res) => {
  const d = req.body;

  const { data, error } = await supabase
    .from("dossiers_instruction")
    .update({
      type: d.type || "",
      statut: d.statut || "",
      date_ouverture: d.date_ouverture || "",
      echeance: d.echeance || "",
      notes: d.notes || "",
    })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) {
    console.error("Erreur update dossier:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.delete("/api/dossiers-instruction/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("dossiers_instruction")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    console.error("Erreur delete dossier:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

/* START */

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});