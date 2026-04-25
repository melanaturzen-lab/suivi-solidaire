const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const DB_PATH = process.env.DB_PATH || "./database.sqlite";

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'benevole'
    )
  `);

  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      beneficiaire_id INTEGER NOT NULL,
      date TEXT,
      type TEXT,
      description TEXT,
      FOREIGN KEY (beneficiaire_id) REFERENCES beneficiaires(id)
    )
  `);
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token manquant" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
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

    db.run(
      "INSERT INTO users (nom, email, password_hash) VALUES (?, ?, ?)",
      [nom, email, passwordHash],
      function (err) {
        if (err) {
          return res.status(400).json({
            error: "Utilisateur déjà existant ou données invalides",
          });
        }

        res.json({ success: true, id: this.lastID });
      }
    );
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
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
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

app.get("/api/beneficiaires", authMiddleware, (req, res) => {
  db.all("SELECT * FROM beneficiaires ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/beneficiaires", authMiddleware, (req, res) => {
  const b = req.body;

  db.run(
    `
    INSERT INTO beneficiaires
    (nom, age, profil, ville, priorite, besoin, telephone, email, adresse, referent, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, ...b });
    }
  );
});

app.put("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  const b = req.body;

  db.run(
    `
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
    `,
    [
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
      req.params.id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

app.delete("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  db.run("DELETE FROM actions WHERE beneficiaire_id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.run("DELETE FROM beneficiaires WHERE id = ?", [req.params.id], function (err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

app.get("/api/beneficiaires/:id/actions", authMiddleware, (req, res) => {
  db.all(
    "SELECT * FROM actions WHERE beneficiaire_id = ? ORDER BY date DESC, id DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post("/api/beneficiaires/:id/actions", authMiddleware, (req, res) => {
  const a = req.body;

  db.run(
    `
    INSERT INTO actions
    (beneficiaire_id, date, type, description)
    VALUES (?, ?, ?, ?)
    `,
    [req.params.id, a.date, a.type, a.description],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: this.lastID,
        beneficiaire_id: req.params.id,
        ...a,
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});