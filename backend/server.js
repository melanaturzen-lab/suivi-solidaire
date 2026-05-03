const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "secret";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

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
      .insert([{ nom: nom || "", email, password: passwordHash, role: "benevole" }])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

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

  if (error || !user) return res.status(401).json({ error: "Identifiants incorrects" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role || "benevole" },
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

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/beneficiaires", authMiddleware, async (req, res) => {
  const b = req.body;

  const { data, error } = await supabase
    .from("beneficiaires")
    .insert([{
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
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
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

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/beneficiaires/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;

  await supabase.from("actions").delete().eq("beneficiaire_id", id);
  await supabase.from("entretiens").delete().eq("beneficiaire_id", id);
  await supabase.from("dossiers_instruction").delete().eq("beneficiaire_id", id);
  await supabase.from("documents").delete().eq("beneficiaire_id", id);

  const { error } = await supabase.from("beneficiaires").delete().eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* ACTIONS */

app.get("/api/beneficiaires/:id/actions", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("actions")
    .select("*")
    .eq("beneficiaire_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/beneficiaires/:id/actions", authMiddleware, async (req, res) => {
  const a = req.body;

  const { data, error } = await supabase
    .from("actions")
    .insert([{
      beneficiaire_id: req.params.id,
      date: a.date || new Date().toISOString().slice(0, 10),
      type: a.type || "",
      description: a.description || "",
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ENTRETIENS */

app.get("/api/entretiens", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("entretiens")
    .select("*, beneficiaires(id, nom, ville)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/entretiens", authMiddleware, async (req, res) => {
  const e = req.body;

  if (!e.beneficiaire_id) {
    return res.status(400).json({ error: "beneficiaire_id obligatoire" });
  }

  const { data, error } = await supabase
    .from("entretiens")
    .insert([{
      beneficiaire_id: e.beneficiaire_id,
      date: e.date || new Date().toISOString().slice(0, 10),
      type: e.type || "",
      compte_rendu: e.compte_rendu || "",
      suite_a_donner: e.suite_a_donner || "",
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/entretiens/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase.from("entretiens").delete().eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* DOSSIERS */

app.get("/api/dossiers-instruction", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("dossiers_instruction")
    .select("*, beneficiaires(id, nom, ville)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/dossiers-instruction", authMiddleware, async (req, res) => {
  const d = req.body;

  if (!d.beneficiaire_id) {
    return res.status(400).json({ error: "beneficiaire_id obligatoire" });
  }

  const { data, error } = await supabase
    .from("dossiers_instruction")
    .insert([{
      beneficiaire_id: d.beneficiaire_id,
      type: d.type || "",
      statut: d.statut || "Ouvert",
      date_ouverture: d.date_ouverture || new Date().toISOString().slice(0, 10),
      echeance: d.echeance || "",
      notes: d.notes || "",
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete("/api/dossiers-instruction/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("dossiers_instruction")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* DOCUMENTS */

app.get("/api/documents", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("documents")
    .select(`
      *,
      beneficiaires(id, nom),
      dossiers_instruction(id, type, statut)
    `)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/beneficiaires/:id/documents", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("beneficiaire_id", req.params.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/documents/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { beneficiaire_id, dossier_id, notes } = req.body;

    if (!req.file) return res.status(400).json({ error: "Fichier manquant" });
    if (!beneficiaire_id) return res.status(400).json({ error: "beneficiaire_id obligatoire" });

    const originalName = req.file.originalname;
    const safeName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filePath = `${beneficiaire_id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error("Erreur upload storage:", uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: publicData } = supabase.storage
      .from("documents")
      .getPublicUrl(filePath);

    const publicUrl = publicData.publicUrl;

    const { data, error } = await supabase
      .from("documents")
      .insert([{
        beneficiaire_id,
        dossier_id: dossier_id || null,
        nom: originalName,
        type: req.file.mimetype,
        url: publicUrl,
        notes: notes || "",
      }])
      .select()
      .single();

    if (error) {
      console.error("Erreur insert document:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error("Erreur upload document:", error);
    res.status(500).json({ error: "Erreur upload document" });
  }
});

app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: "Document introuvable" });
  }

  const marker = "/storage/v1/object/public/documents/";
  const filePath = doc.url?.includes(marker)
    ? doc.url.split(marker)[1]
    : null;

  if (filePath) {
    await supabase.storage.from("documents").remove([filePath]);
  }

  const { error } = await supabase.from("documents").delete().eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get("/api/documents/:id/download", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: "Document introuvable" });
    }

    const response = await fetch(doc.url);
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Disposition", `attachment; filename="${doc.nom}"`);
    res.setHeader("Content-Type", doc.type || "application/octet-stream");

    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* =========================
   ATELIERS
========================= */

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

app.delete("/api/ateliers/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("ateliers")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/atelier-participants/:id", authMiddleware, async (req, res) => {
  const { error } = await supabase
    .from("atelier_participants")
    .delete()
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* START */

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});