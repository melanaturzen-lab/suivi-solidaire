import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL;

const emptyBeneficiaire = {
  nom: "",
  age: "",
  profil: "",
  ville: "",
  priorite: "",
  besoin: "",
  telephone: "",
  email: "",
  adresse: "",
  referent: "",
  notes: "",
};

const emptyEntretien = {
  beneficiaire_id: "",
  date: "",
  type: "",
  compte_rendu: "",
  suite_a_donner: "",
};

const emptyDossier = {
  beneficiaire_id: "",
  type: "",
  statut: "Ouvert",
  date_ouverture: "",
  echeance: "",
  notes: "",
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [page, setPage] = useState("dashboard");
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setBeneficiaires([]);
    setSelected(null);
  }

  async function loadBeneficiaires() {
    if (!token) return;

    try {
      const res = await fetch(`${API}/beneficiaires`, {
        headers: headers(),
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      setBeneficiaires(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      showToast("Erreur chargement bénéficiaires", "error");
    }
  }

  useEffect(() => {
    loadBeneficiaires();
  }, [token]);

  if (!token) {
    return (
      <>
        <AuthPage setToken={setToken} setUser={setUser} showToast={showToast} />
        <Toast toast={toast} />
        <Styles />
      </>
    );
  }

  return (
    <div className="app">
      <Toast toast={toast} />

      <aside className="sidebar">
        <div>
          <div className="brand">
            <img src={logo} alt="Logo" />
            <div>
              <h2>Suivi Solidaire</h2>
              <span>Production</span>
            </div>
          </div>

          <p className="muted">Connecté : {user?.email}</p>

          <button onClick={() => setPage("dashboard")}>Tableau de bord</button>
          <button onClick={() => setPage("beneficiaires")}>Bénéficiaires</button>
          <button onClick={() => setPage("accompagnement")}>Accompagnement</button>
          <button onClick={() => setPage("documents")}>Documents</button>
          <button onClick={() => setPage("securite")}>Confidentialité</button>
        </div>

        <button className="danger" onClick={logout}>Déconnexion</button>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <p>La Voix des Ancêtres</p>
            <h1>Plateforme de suivi solidaire</h1>
          </div>
          <strong>Backend en ligne</strong>
        </header>

        {page === "dashboard" && <Dashboard beneficiaires={beneficiaires} />}

        {page === "beneficiaires" && (
          <Beneficiaires
            beneficiaires={beneficiaires}
            selected={selected}
            setSelected={setSelected}
            loadBeneficiaires={loadBeneficiaires}
            headers={headers}
            showToast={showToast}
          />
        )}

        {page === "accompagnement" && (
          <Accompagnement
            beneficiaires={beneficiaires}
            headers={headers}
            showToast={showToast}
          />
        )}

        {page === "documents" && (
  <Documents
    beneficiaires={beneficiaires}
    headers={headers}
    showToast={showToast}
  />
)}

        {page === "securite" && (
          <Panel title="Confidentialité" text="Connexion sécurisée, API protégée par token et RLS Supabase activé." />
        )}
      </main>

      <Styles />
    </div>
  );
}

function AuthPage({ setToken, setUser, showToast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nom: "", email: "", password: "" });

  async function submit(e) {
    e.preventDefault();

    const endpoint = mode === "login" ? "login" : "register";

    try {
      const res = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Erreur", "error");
        return;
      }

      if (mode === "register") {
        showToast("Compte créé. Connecte-toi maintenant.");
        setMode("login");
        setForm({ nom: "", email: "", password: "" });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
      showToast("Connexion réussie.");
    } catch (e) {
      console.error(e);
      showToast("Erreur serveur", "error");
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <img src={logo} alt="Logo" />
        <h1>Suivi Solidaire</h1>
        <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>

        {mode === "register" && (
          <input
            placeholder="Nom"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
          />
        )}

        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <input
          placeholder="Mot de passe"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button className="primary">
          {mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ beneficiaires }) {
  const total = beneficiaires.length;

  const urgents = beneficiaires.filter(
    (b) => b.priorite?.toLowerCase() === "urgente"
  ).length;

  const sansVille = beneficiaires.filter(
    (b) => !b.ville
  ).length;

  return (
    <>
      <h1>Tableau de bord</h1>

      <div className="cards">
        <div className="card">
          <p>Total bénéficiaires</p>
          <h2>{total}</h2>
        </div>

        <div className="card">
          <p>Situations urgentes</p>
          <h2>{urgents}</h2>
        </div>

        <div className="card">
          <p>Dossiers incomplets</p>
          <h2>{sansVille}</h2>
        </div>
      </div>
    </>
  );
}

function Beneficiaires({ beneficiaires, selected, setSelected, loadBeneficiaires, headers, showToast }) {
  const [form, setForm] = useState(emptyBeneficiaire);
  const [showForm, setShowForm] = useState(false);

  async function addBeneficiaire() {
    if (!form.nom) {
      showToast("Le nom est obligatoire", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/beneficiaires`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      setForm(emptyBeneficiaire);
      setShowForm(false);
      await loadBeneficiaires();
      showToast("Bénéficiaire ajouté.");
    } catch {
      showToast("Erreur ajout bénéficiaire", "error");
    }
  }

  async function deleteBeneficiaire(id) {
    if (!confirm("Supprimer ce bénéficiaire ?")) return;

    try {
      const res = await fetch(`${API}/beneficiaires/${id}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!res.ok) throw new Error();

      setSelected(null);
      await loadBeneficiaires();
      showToast("Bénéficiaire supprimé.");
    } catch {
      showToast("Erreur suppression", "error");
    }
  }

  function exportPDF() {
    if (!selected) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Suivi Solidaire", 10, 20);
    doc.setFontSize(14);
    doc.text("Fiche bénéficiaire", 10, 35);

    let y = 55;
    Object.entries(selected).forEach(([key, value]) => {
      if (["id", "created_at"].includes(key)) return;
      doc.text(`${key} : ${value || "Non renseigné"}`, 10, y);
      y += 8;
    });

    doc.save(`fiche-${selected.nom || "beneficiaire"}.pdf`);
    showToast("PDF exporté.");
  }

  return (
    <>
      <div className="page-head">
        <h1>Bénéficiaires</h1>
        <button className="primary" onClick={() => setShowForm(!showForm)}>
          + Ajouter
        </button>
      </div>

      {showForm && (
        <div className="panel">
          <h2>Nouveau bénéficiaire</h2>
          <div className="grid">
            {Object.keys(emptyBeneficiaire).map((key) => (
              <input
                key={key}
                placeholder={key}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
          </div>
          <button className="primary" onClick={addBeneficiaire}>Enregistrer</button>
        </div>
      )}

      <div className="layout">
        <div className="list">
          {beneficiaires.map((b) => (
            <div
              key={b.id}
              className={`item ${selected?.id === b.id ? "active" : ""}`}
              onClick={() => setSelected(b)}
            >
              <h3>{b.nom}</h3>
              <p>{b.ville || "Ville non renseignée"}</p>
              <p>{b.profil || "Profil non renseigné"}</p>
            </div>
          ))}
        </div>

        <div className="panel">
          {!selected ? (
            <p>Sélectionne un bénéficiaire.</p>
          ) : (
            <>
              <h2>{selected.nom}</h2>
              <p><strong>Âge :</strong> {selected.age}</p>
              <p><strong>Ville :</strong> {selected.ville}</p>
              <p><strong>Profil :</strong> {selected.profil}</p>
              <p><strong>Besoins :</strong> {selected.besoin}</p>
              <p><strong>Notes :</strong> {selected.notes}</p>

              <button className="primary" onClick={exportPDF}>Exporter PDF</button>
              <button className="danger" onClick={() => deleteBeneficiaire(selected.id)}>
                Supprimer
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Accompagnement({ beneficiaires, headers, showToast }) {
  const [tab, setTab] = useState("entretiens");
  const [entretiens, setEntretiens] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [entretien, setEntretien] = useState(emptyEntretien);
  const [dossier, setDossier] = useState(emptyDossier);

  async function loadEntretiens() {
    try {
      const res = await fetch(`${API}/entretiens`, { headers: headers() });
      const data = await res.json();
      setEntretiens(Array.isArray(data) ? data : []);
    } catch {
      showToast("Erreur chargement entretiens", "error");
    }
  }

  async function loadDossiers() {
    try {
      const res = await fetch(`${API}/dossiers-instruction`, { headers: headers() });
      const data = await res.json();
      setDossiers(Array.isArray(data) ? data : []);
    } catch {
      showToast("Erreur chargement dossiers", "error");
    }
  }

  useEffect(() => {
    loadEntretiens();
    loadDossiers();
  }, []);

  async function addEntretien() {
    if (!entretien.beneficiaire_id || !entretien.type) {
      showToast("Bénéficiaire et type obligatoires", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/entretiens`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(entretien),
      });

      if (!res.ok) throw new Error();

      setEntretien(emptyEntretien);
      await loadEntretiens();
      showToast("Entretien ajouté.");
    } catch {
      showToast("Erreur ajout entretien", "error");
    }
  }

  async function addDossier() {
    if (!dossier.beneficiaire_id || !dossier.type) {
      showToast("Bénéficiaire et type obligatoires", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/dossiers-instruction`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(dossier),
      });

      if (!res.ok) throw new Error();

      setDossier(emptyDossier);
      await loadDossiers();
      showToast("Dossier ajouté.");
    } catch {
      showToast("Erreur ajout dossier", "error");
    }
  }

  return (
    <>
      <h1>Accompagnement</h1>

      <div className="tabs">
        <button className={tab === "entretiens" ? "active-tab" : ""} onClick={() => setTab("entretiens")}>
          Entretiens
        </button>
        <button className={tab === "dossiers" ? "active-tab" : ""} onClick={() => setTab("dossiers")}>
          Dossiers d’instruction
        </button>
      </div>

      {tab === "entretiens" && (
        <div className="layout">
          <div className="panel">
            <h2>Nouvel entretien</h2>

            <select
              value={entretien.beneficiaire_id}
              onChange={(e) => setEntretien({ ...entretien, beneficiaire_id: e.target.value })}
            >
              <option value="">Choisir un bénéficiaire</option>
              {beneficiaires.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>

            <input
              type="date"
              value={entretien.date}
              onChange={(e) => setEntretien({ ...entretien, date: e.target.value })}
            />

            <input
              placeholder="Type d’entretien"
              value={entretien.type}
              onChange={(e) => setEntretien({ ...entretien, type: e.target.value })}
            />

            <textarea
              placeholder="Compte-rendu"
              value={entretien.compte_rendu}
              onChange={(e) => setEntretien({ ...entretien, compte_rendu: e.target.value })}
            />

            <textarea
              placeholder="Suite à donner"
              value={entretien.suite_a_donner}
              onChange={(e) => setEntretien({ ...entretien, suite_a_donner: e.target.value })}
            />

            <button className="primary" onClick={addEntretien}>Ajouter</button>
          </div>

          <div className="panel">
            <h2>Entretiens</h2>
            {entretiens.map((e) => (
              <div className="history" key={e.id}>
                <strong>{e.date} — {e.type}</strong>
                <p>{e.beneficiaires?.nom}</p>
                <p>{e.compte_rendu}</p>
                <p><strong>Suite :</strong> {e.suite_a_donner}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "dossiers" && (
        <div className="layout">
          <div className="panel">
            <h2>Nouveau dossier</h2>

            <select
              value={dossier.beneficiaire_id}
              onChange={(e) => setDossier({ ...dossier, beneficiaire_id: e.target.value })}
            >
              <option value="">Choisir un bénéficiaire</option>
              {beneficiaires.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>

            <input
              placeholder="Type de dossier"
              value={dossier.type}
              onChange={(e) => setDossier({ ...dossier, type: e.target.value })}
            />

            <select
              value={dossier.statut}
              onChange={(e) => setDossier({ ...dossier, statut: e.target.value })}
            >
              <option>Ouvert</option>
              <option>En cours</option>
              <option>En attente</option>
              <option>Urgent</option>
              <option>Clos</option>
            </select>

            <input
              type="date"
              value={dossier.date_ouverture}
              onChange={(e) => setDossier({ ...dossier, date_ouverture: e.target.value })}
            />

            <input
              type="date"
              value={dossier.echeance}
              onChange={(e) => setDossier({ ...dossier, echeance: e.target.value })}
            />

            <textarea
              placeholder="Notes"
              value={dossier.notes}
              onChange={(e) => setDossier({ ...dossier, notes: e.target.value })}
            />

            <button className="primary" onClick={addDossier}>Ajouter</button>
          </div>

          <div className="panel">
            <h2>Dossiers</h2>
            {dossiers.map((d) => (
              <div className="history" key={d.id}>
                <strong>{d.type}</strong>
                <p>{d.beneficiaires?.nom}</p>
                <p>Statut : {d.statut}</p>
                <p>Échéance : {d.echeance}</p>
                <p>{d.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
function Documents({ beneficiaires, headers, showToast }) {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [beneficiaireId, setBeneficiaireId] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
const [previewUrl, setPreviewUrl] = useState(null);

  async function loadDocuments() {
    try {
      const res = await fetch(`${API}/documents`, {
        headers: headers(),
      });

      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast("Erreur chargement documents", "error");
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadDocument() {
    if (!file || !beneficiaireId) {
      showToast("Choisis un bénéficiaire et un fichier.", "error");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("beneficiaire_id", beneficiaireId);
      formData.append("notes", notes);

      const res = await fetch(`${API}/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: headers().Authorization,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Erreur upload document", "error");
        return;
      }

      setFile(null);
      setBeneficiaireId("");
      setNotes("");
      await loadDocuments();

      showToast("Document ajouté avec succès.");
    } catch (error) {
      console.error(error);
      showToast("Erreur upload document", "error");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(id) {
    if (!confirm("Supprimer ce document ?")) return;

    try {
      const res = await fetch(`${API}/documents/${id}`, {
        method: "DELETE",
        headers: headers(),
      });

      if (!res.ok) {
        showToast("Erreur suppression document", "error");
        return;
      }

      await loadDocuments();
      showToast("Document supprimé.");
    } catch (error) {
      console.error(error);
      showToast("Erreur suppression document", "error");
    }
  }

  return (
    <>
      <h1>Documents</h1>

      <div className="layout">
        <div className="panel">
          <h2>Ajouter un document</h2>

          <select
            value={beneficiaireId}
            onChange={(e) => setBeneficiaireId(e.target.value)}
          >
            <option value="">Choisir un bénéficiaire</option>
            {beneficiaires.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nom}
              </option>
            ))}
          </select>

          <input
            type="file"
            accept=".pdf,image/*,.doc,.docx"
            onChange={(e) => setFile(e.target.files[0])}
          />

          <textarea
            placeholder="Notes sur le document..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <button className="primary" onClick={uploadDocument} disabled={uploading}>
            {uploading ? "Upload en cours..." : "Uploader le document"}
          </button>
        </div>

        <div className="panel">
          <h2>Documents enregistrés</h2>

          {documents.length === 0 ? (
            <p className="muted">Aucun document enregistré.</p>
          ) : (
            documents.map((doc) => (
              <div className="history" key={doc.id}>
                <h3>{doc.nom}</h3>
                <p className="muted">
                  Bénéficiaire : {doc.beneficiaires?.nom || "Non renseigné"}
                </p>
                <p>{doc.notes || "Aucune note."}</p>

                <br />
<button
  onClick={() => setPreviewUrl(doc.url)}
  style={{ marginTop: 10 }}
>
  👁️ Voir
</button>

                <button
                  className="danger"
                  onClick={() => deleteDocument(doc.id)}
                  style={{ marginTop: 10 }}
                >
                  Supprimer
                </button>
              </div>
            ))
          )}
          {previewUrl && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(2, 6, 23, 0.92)",
      backdropFilter: "blur(10px)",
      zIndex: 9999,
      padding: 24,
      animation: "fadeIn 0.25s ease",
    }}
  >
    <div
      style={{
        height: "100%",
        background: "linear-gradient(180deg, #0f172a, #020617)",
        border: "1px solid rgba(148,163,184,0.25)",
        borderRadius: 20,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Aperçu du document</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Consultez le document ou ouvrez-le en grand.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => window.open(previewUrl, "_blank")}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "10px 14px",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Télécharger / Ouvrir
          </button>

          <button
            onClick={() => setPreviewUrl(null)}
            style={{
              background: "#991b1b",
              color: "white",
              padding: "10px 14px",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      <iframe
        src={previewUrl}
        style={{
          flex: 1,
          width: "100%",
          border: "none",
          borderRadius: 14,
          background: "white",
        }}
      />
    </div>
  </div>
)}
function Panel({ title, text }) {
  return (
    <div className="panel">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}

function Styles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; background: #07111f; }

      .app {
        display: flex;
        min-height: 100vh;
        background: radial-gradient(circle at top left, #1d4ed855, transparent 30%), #07111f;
        color: #e5e7eb;
      }

      .sidebar {
        width: 290px;
        padding: 24px;
        background: #020617dd;
        border-right: 1px solid #334155;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 20px;
      }

      .brand img {
        width: 64px;
        height: 64px;
        object-fit: contain;
        background: white;
        border-radius: 18px;
        padding: 6px;
      }

      .brand h2 { margin: 0; }
      .brand span {
        color: #86efac;
        font-size: 12px;
      }

      .sidebar button {
        width: 100%;
        margin-top: 10px;
        padding: 13px;
        border-radius: 14px;
        border: 1px solid #334155;
        background: #0f172a;
        color: white;
        text-align: left;
        cursor: pointer;
      }

      .sidebar button:hover {
        background: linear-gradient(135deg, #2563eb, #38bdf8);
      }

      .main {
        flex: 1;
        padding: 28px;
      }

      .header {
        background: linear-gradient(135deg, #0f4c81, #2563eb);
        border-radius: 26px;
        padding: 26px;
        margin-bottom: 28px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .header p {
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #bfdbfe;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
      }

      .card, .panel, .item, .history {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid #334155;
        border-radius: 22px;
        padding: 20px;
        margin-bottom: 16px;
      }

      .card h2 {
        color: #60a5fa;
        font-size: 34px;
      }

      .layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px;
      }

      .item {
        cursor: pointer;
      }

      .item.active {
        border-color: #38bdf8;
        background: rgba(37, 99, 235, 0.2);
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      input, textarea, select {
        width: 100%;
        margin-bottom: 10px;
        padding: 12px;
        border-radius: 12px;
        border: 1px solid #334155;
        background: #020617;
        color: white;
      }

      textarea {
        min-height: 90px;
      }

      button {
        padding: 12px 15px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        margin-right: 8px;
      }

      .primary {
        background: linear-gradient(135deg, #2563eb, #38bdf8);
        color: white;
      }

      .secondary {
        background: #334155;
        color: white;
      }

      .danger {
        background: #7f1d1d !important;
        color: white !important;
      }

      .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .tabs button {
        background: #0f172a;
        color: white;
        border: 1px solid #334155;
      }

      .active-tab {
        background: linear-gradient(135deg, #2563eb, #38bdf8) !important;
      }

      .toast {
        position: fixed;
        right: 20px;
        bottom: 20px;
        padding: 14px 18px;
        border-radius: 14px;
        color: white;
        background: #16a34a;
      }

      .toast.error {
        background: #dc2626;
      }

      .auth {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #07111f;
        color: white;
      }

      .auth-card {
        width: 390px;
        padding: 30px;
        border-radius: 24px;
        background: #0f172a;
        border: 1px solid #334155;
      }

      .auth-card img {
        width: 80px;
        background: white;
        border-radius: 18px;
        padding: 6px;
      }

      .muted { color: #94a3b8; }

      @media (max-width: 900px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; }
        .layout, .cards, .grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}