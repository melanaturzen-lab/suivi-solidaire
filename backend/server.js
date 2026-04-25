const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const DB_PATH = process.env.DB_PATH || "/tmp/database.sqlite";

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'benevole'
  );

  CREATE TABLE IF NOT EXISTS beneficiaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    age TEXT,
    profil TEXT,
    ville TEXT,
    priorite TEXT,
    besoin TEXT,
    telephone TEXT,
    email TEXT,
    adresse TEXT,
    referent TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    beneficiaire_id INTEGER NOT NULL,
    date TEXT,
    type TEXT,
    description TEXT,
    FOREIGN KEY (beneficiaire_id) REFERENCES beneficiaires(id)
  );
`);

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
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

app.get("/", (req, res) => {
  res.send("Backend Suivi Solidaire opérationnel");
});

app.post("/api/auth/register", async (req, res) => {
  const { nom, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe obligatoires" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = db
      .prepare("INSERT INTO users (nom, email, password_hash) VALUES (?, ?, ?)")
      .run(nom || "", email, passwordHash);

    res.json({ success: true, id: result.lastInsertRowid });
  } catch {
    res.status(400).json({ error: "Utilisateur déjà existant ou données invalides" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ error: "Identifiants incorrects" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nom: user.nom,
      email: user.email,
      role: user.role,
    },
  });
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

app.get("/api/beneficiaires", authMiddleware, (req, res) => {
  const rows = db.prepare("SELECT * FROM beneficiaires ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/beneficiaires", authMiddleware, (req, res) => {
  const b = req.body;

  const result = db
    .prepare(`
      INSERT INTO beneficiaires
      (nom, age, profil, ville, priorite, besoin, telephone, email, adresse, referent, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      b.nom,
      b.age,
      b.profil,
      b.ville,
      b.priorite,
      b.besoin,
      b.telephone,
      b.email,
      b.adresse,
      b.referent,
      b.notes
    );

  res.json({ id: result.lastInsertRowid, ...b });
});

app.put("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  const b = req.body;

  db.prepare(`
    UPDATE beneficiaires SET
      nom = ?,
      age = ?,
      profil = ?,
      ville = ?,
      priorite = ?,
      besoin = ?,
      telephone = ?,
      email = ?,
      adresse = ?,
      referent = ?,
      notes = ?
    WHERE id = ?
  `).run(
    b.nom,
    b.age,
    b.profil,
    b.ville,
    b.priorite,
    b.besoin,
    b.telephone,
    b.email,
    b.adresse,
    b.referent,
    b.notes,
    req.params.id
  );

  res.json({ success: true });
});

app.delete("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM actions WHERE beneficiaire_id = ?").run(req.params.id);
  db.prepare("DELETE FROM beneficiaires WHERE id = ?").run(req.params.id);

  res.json({ success: true });
});

app.get("/api/beneficiaires/:id/actions", authMiddleware, (req, res) => {
  const rows = db
    .prepare(`
      SELECT * FROM actions
      WHERE beneficiaire_id = ?
      ORDER BY date DESC, id DESC
    `)
    .all(req.params.id);

  res.json(rows);
});

app.post("/api/beneficiaires/:id/actions", authMiddleware, (req, res) => {
  const a = req.body;

  const result = db
    .prepare(`
      INSERT INTO actions
      (beneficiaire_id, date, type, description)
      VALUES (?, ?, ?, ?)
    `)
    .run(req.params.id, a.date, a.type, a.description);

  res.json({
    id: result.lastInsertRowid,
    beneficiaire_id: req.params.id,
    ...a,
  });
});

app.listen(PORT, () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});