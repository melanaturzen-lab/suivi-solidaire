const express = require("express")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const Database = require("better-sqlite3")

const app = express()
app.use(cors())
app.use(express.json())

// 🔐 Clé JWT
const SECRET = "mon_secret_super_securise"

// 📦 Base SQLite (compatible Render)
const dbPath = process.env.DB_PATH || "/tmp/database.sqlite"
const db = new Database(dbPath)

// ==============================
// 📊 TABLES
// ==============================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)

CREATE TABLE IF NOT EXISTS beneficiaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT,
  age INTEGER,
  situation TEXT
)

CREATE TABLE IF NOT EXISTS actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  beneficiaire_id INTEGER,
  texte TEXT,
  date TEXT
)
`)

// ==============================
// 🔐 AUTH MIDDLEWARE
// ==============================

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) return res.status(401).json({ error: "Token manquant" })

  try {
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch {
    res.status(403).json({ error: "Token invalide" })
  }
}

// ==============================
// 🔐 AUTH ROUTES
// ==============================

// Inscription
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body

  const hash = await bcrypt.hash(password, 10)

  try {
    db.prepare("INSERT INTO users (email, password) VALUES (?, ?)")
      .run(email, hash)

    res.json({ message: "Utilisateur créé" })
  } catch {
    res.status(400).json({ error: "Email déjà utilisé" })
  }
})

// Connexion
app.post("/api/login", (req, res) => {
  const { email, password } = req.body

  const user = db.prepare("SELECT * FROM users WHERE email = ?")
    .get(email)

  if (!user) return res.status(401).json({ error: "Utilisateur introuvable" })

  const valid = bcrypt.compareSync(password, user.password)

  if (!valid) return res.status(401).json({ error: "Mot de passe incorrect" })

  const token = jwt.sign({ id: user.id }, SECRET)

  res.json({ token })
})

// ==============================
// 👥 BENEFICIAIRES
// ==============================

// Liste
app.get("/api/beneficiaires", authMiddleware, (req, res) => {
  const data = db.prepare("SELECT * FROM beneficiaires").all()
  res.json(data)
})

// Ajouter
app.post("/api/beneficiaires", authMiddleware, (req, res) => {
  const { nom, age, situation } = req.body

  const result = db.prepare(
    "INSERT INTO beneficiaires (nom, age, situation) VALUES (?, ?, ?)"
  ).run(nom, age, situation)

  res.json({ id: result.lastInsertRowid })
})

// Modifier
app.put("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  const { nom, age, situation } = req.body

  db.prepare(`
    UPDATE beneficiaires
    SET nom = ?, age = ?, situation = ?
    WHERE id = ?
  `).run(nom, age, situation, req.params.id)

  res.json({ message: "Modifié" })
})

// Supprimer
app.delete("/api/beneficiaires/:id", authMiddleware, (req, res) => {
  db.prepare("DELETE FROM beneficiaires WHERE id = ?")
    .run(req.params.id)

  res.json({ message: "Supprimé" })
})

// ==============================
// 📜 ACTIONS / HISTORIQUE
// ==============================

// Liste actions
app.get("/api/actions/:beneficiaire_id", authMiddleware, (req, res) => {
  const data = db.prepare(`
    SELECT * FROM actions
    WHERE beneficiaire_id = ?
    ORDER BY date DESC
  `).all(req.params.beneficiaire_id)

  res.json(data)
})

// Ajouter action
app.post("/api/actions", authMiddleware, (req, res) => {
  const { beneficiaire_id, texte } = req.body

  const date = new Date().toISOString()

  db.prepare(`
    INSERT INTO actions (beneficiaire_id, texte, date)
    VALUES (?, ?, ?)
  `).run(beneficiaire_id, texte, date)

  res.json({ message: "Action ajoutée" })
})

// ==============================
// 🚀 START SERVER
// ==============================

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Serveur démarré sur le port " + PORT)
})