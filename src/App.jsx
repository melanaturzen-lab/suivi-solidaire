import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import logo from "./assets/logo.png";

const API_URL = "https://suivi-solidaire-backend.onrender.com/api";

const emptyForm = {
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

const emptyAction = {
  date: "",
  type: "",
  description: "",
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [page, setPage] = useState("dashboard");
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  function deconnexion() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setBeneficiaires([]);
  }

  async function chargerBeneficiaires() {
    if (!token) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/beneficiaires`, {
        headers: authHeaders(),
      });

      if (response.status === 401) {
        deconnexion();
        showToast("Session expirée. Reconnecte-toi.", "error");
        return;
      }

      const data = await response.json();
      setBeneficiaires(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast("Impossible de charger les bénéficiaires.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerBeneficiaires();
  }, [token]);

  if (!token) {
    return (
      <div className={`theme-${theme}`}>
        <AuthPage setToken={setToken} setUser={setUser} showToast={showToast} />
        <Toast toast={toast} />
        <GlobalStyles />
      </div>
    );
  }

  return (
    <div className={`app theme-${theme}`}>
      <Toast toast={toast} />

      <aside className="sidebar">
        <div>
          <div className="brand">
            <img src={logo} alt="Logo" className="brand-logo" />
            <div>
              <h2>Suivi Solidaire</h2>
              <span className="badge">Production</span>
            </div>
          </div>

          <p className="muted user-line">Connecté : {user?.email}</p>

          <nav>
            <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>
              Tableau de bord
            </button>
            <button className={page === "beneficiaires" ? "active" : ""} onClick={() => setPage("beneficiaires")}>
              Bénéficiaires
            </button>
            <button className={page === "actions" ? "active" : ""} onClick={() => setPage("actions")}>
              Actions
            </button>
            <button className={page === "documents" ? "active" : ""} onClick={() => setPage("documents")}>
              Documents
            </button>
            <button className={page === "securite" ? "active" : ""} onClick={() => setPage("securite")}>
              Confidentialité
            </button>
          </nav>
        </div>

        <button className="danger" onClick={deconnexion}>
          Déconnexion
        </button>
      </aside>

      <main className="main">
        <HeaderPro user={user} theme={theme} setTheme={setTheme} />

        {loading && <p className="muted">Chargement...</p>}

        {!loading && page === "dashboard" && <Dashboard beneficiaires={beneficiaires} />}
        {!loading && page === "beneficiaires" && (
          <Beneficiaires
            beneficiaires={beneficiaires}
            chargerBeneficiaires={chargerBeneficiaires}
            authHeaders={authHeaders}
            showToast={showToast}
          />
        )}
        {!loading && page === "actions" && <Actions />}
        {!loading && page === "documents" && <Documents />}
        {!loading && page === "securite" && <Securite />}
      </main>

      <GlobalStyles />
    </div>
  );
}

function HeaderPro({ user, theme, setTheme }) {
  return (
    <header className="top-header fade-in">
      <div>
        <p className="eyebrow">La Voix des Ancêtres</p>
        <h1>Plateforme de suivi solidaire</h1>
      </div>

      <div className="header-right">
        <span className="status-dot"></span>
        <span>Backend en ligne</span>
        <span className="header-user">{user?.role || "bénévole"}</span>
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "☀️ Clair" : "🌙 Sombre"}
        </button>
      </div>
    </header>
  );
}

function AuthPage({ setToken, setUser, showToast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ nom: "", email: "", password: "" });

  async function submit(e) {
    e.preventDefault();

    const endpoint = mode === "login" ? "login" : "register";

    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || "Erreur de connexion.", "error");
        return;
      }

      if (mode === "register") {
        showToast("Compte créé. Tu peux maintenant te connecter.", "success");
        setMode("login");
        setForm({ nom: "", email: "", password: "" });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      showToast("Connexion réussie.", "success");
    } catch (error) {
      console.error(error);
      showToast("Erreur de connexion au serveur.", "error");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card fade-in" onSubmit={submit}>
        <img src={logo} alt="Logo" className="auth-logo" />
        <h1>Suivi Solidaire</h1>
        <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>

        {mode === "register" && (
          <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        )}

        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Mot de passe" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

        <button type="submit" className="primary">
          {mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>

        <button type="button" className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ beneficiaires }) {
  const urgents = beneficiaires.filter((b) => b.priorite === "Élevée").length;

  return (
    <section className="fade-in">
      <h1>Tableau de bord</h1>
      <div className="cards">
        <Card title="Bénéficiaires" value={beneficiaires.length} />
        <Card title="Situations urgentes" value={urgents} />
        <Card title="Statut" value="En ligne" />
      </div>
    </section>
  );
}

function Card({ title, value }) {
  return (
    <div className="card hover-card">
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function Beneficiaires({ beneficiaires, chargerBeneficiaires, authHeaders, showToast }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actions, setActions] = useState([]);
  const [actionForm, setActionForm] = useState(emptyAction);

  const filtered = beneficiaires.filter((b) =>
    `${b.nom || ""} ${b.ville || ""} ${b.profil || ""} ${b.besoin || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selected && beneficiaires.length > 0) setSelected(beneficiaires[0]);
  }, [beneficiaires, selected]);

  useEffect(() => {
    if (selected?.id) chargerActions(selected.id);
  }, [selected]);

  async function chargerActions(beneficiaireId) {
    try {
      const response = await fetch(`${API_URL}/beneficiaires/${beneficiaireId}/actions`, {
        headers: authHeaders(),
      });

      const data = await response.json();
      setActions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast("Impossible de charger l’historique.", "error");
    }
  }

  function ouvrirAjout() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function ouvrirModification(beneficiaire) {
    setForm({
      nom: beneficiaire.nom || "",
      age: beneficiaire.age || "",
      profil: beneficiaire.profil || "",
      ville: beneficiaire.ville || "",
      priorite: beneficiaire.priorite || "",
      besoin: beneficiaire.besoin || "",
      telephone: beneficiaire.telephone || "",
      email: beneficiaire.email || "",
      adresse: beneficiaire.adresse || "",
      referent: beneficiaire.referent || "",
      notes: beneficiaire.notes || "",
    });

    setEditId(beneficiaire.id);
    setShowForm(true);
  }

  async function enregistrer() {
    if (!form.nom || !form.age || !form.profil) {
      showToast("Merci de remplir au moins le nom, l’âge et le profil.", "error");
      return;
    }

    const url = editId === null ? `${API_URL}/beneficiaires` : `${API_URL}/beneficiaires/${editId}`;
    const method = editId === null ? "POST" : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        showToast("Erreur serveur lors de l’enregistrement.", "error");
        return;
      }

      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      await chargerBeneficiaires();

      showToast(editId === null ? "Bénéficiaire ajouté avec succès." : "Fiche modifiée avec succès.");
    } catch (error) {
      console.error(error);
      showToast("Impossible d’enregistrer.", "error");
    }
  }

  async function supprimer(beneficiaire) {
    if (!window.confirm(`Supprimer définitivement ${beneficiaire.nom} ?`)) return;

    try {
      const response = await fetch(`${API_URL}/beneficiaires/${beneficiaire.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        showToast("Erreur serveur lors de la suppression.", "error");
        return;
      }

      setSelected(null);
      setActions([]);
      await chargerBeneficiaires();
      showToast("Bénéficiaire supprimé.");
    } catch (error) {
      console.error(error);
      showToast("Impossible de supprimer.", "error");
    }
  }

  async function ajouterAction() {
    if (!selected) return;

    if (!actionForm.date || !actionForm.type || !actionForm.description) {
      showToast("Merci de remplir la date, le type et la description.", "error");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/beneficiaires/${selected.id}/actions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(actionForm),
      });

      if (!response.ok) {
        showToast("Erreur serveur lors de l’ajout de l’action.", "error");
        return;
      }

      setActionForm(emptyAction);
      await chargerActions(selected.id);
      showToast("Action ajoutée à l’historique.");
    } catch (error) {
      console.error(error);
      showToast("Impossible d’ajouter l’action.", "error");
    }
  }

  function imageToBase64(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function exporterPDF() {
    if (!selected) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    let logoBase64 = null;
    try {
      logoBase64 = await imageToBase64(logo);
    } catch {
      logoBase64 = null;
    }

    doc.setFillColor(15, 76, 129);
    doc.rect(0, 0, pageWidth, 36, "F");

    if (logoBase64) doc.addImage(logoBase64, "PNG", 12, 7, 22, 22);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Suivi Solidaire", logoBase64 ? 40 : 14, 16);
    doc.setFontSize(11);
    doc.text("La Voix des Ancêtres — Fiche bénéficiaire", logoBase64 ? 40 : 14, 25);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text(selected.nom || "Bénéficiaire", 14, 50);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Export généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 57);

    let y = 72;

    function sectionTitle(title) {
      doc.setTextColor(15, 76, 129);
      doc.setFontSize(13);
      doc.text(title, 14, y);
      y += 8;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
    }

    function row(label, value) {
      doc.setFont(undefined, "bold");
      doc.text(`${label} :`, 14, y);
      doc.setFont(undefined, "normal");
      doc.text(String(value || "Non renseigné"), 55, y);
      y += 7;
    }

    sectionTitle("Informations générales");
    row("Âge", selected.age);
    row("Profil", selected.profil);
    row("Ville", selected.ville);
    row("Adresse", selected.adresse);
    row("Téléphone", selected.telephone);
    row("Email", selected.email);
    row("Référent", selected.referent);

    y += 4;
    sectionTitle("Situation sociale");
    row("Priorité", selected.priorite);
    row("Besoins", selected.besoin);

    doc.setFont(undefined, "bold");
    doc.text("Notes :", 14, y);
    y += 6;

    doc.setFont(undefined, "normal");
    const noteLines = doc.splitTextToSize(selected.notes || "Aucune note renseignée.", 175);
    doc.text(noteLines, 14, y);
    y += noteLines.length * 6 + 10;

    if (y > 235) {
      doc.addPage();
      y = 20;
    }

    sectionTitle("Historique des actions");

    if (actions.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text("Aucune action enregistrée.", 14, y);
    } else {
      actions.forEach((action) => {
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, y - 5, 182, 20, 3, 3, "F");

        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, "bold");
        doc.text(`${action.date || ""} — ${action.type || ""}`, 18, y + 1);

        doc.setFont(undefined, "normal");
        const desc = doc.splitTextToSize(action.description || "", 165);
        doc.text(desc, 18, y + 8);

        y += Math.max(22, desc.length * 5 + 14);
      });
    }

    doc.save(`fiche-${selected.nom || "beneficiaire"}.pdf`);
    showToast("PDF exporté avec succès.");
  }

  return (
    <section className="fade-in">
      <div className="page-header">
        <h1>Bénéficiaires</h1>
        <button className="primary small" onClick={ouvrirAjout}>
          + Ajouter un bénéficiaire
        </button>
      </div>

      <div className="layout">
        <section>
          <input
            className="search"
            placeholder="Rechercher un bénéficiaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {showForm && (
            <div className="panel form-panel scale-in">
              <h3>{editId === null ? "Nouveau bénéficiaire" : "Modifier le bénéficiaire"}</h3>

              <div className="grid-form">
                {Object.keys(emptyForm).map((key) => (
                  <input
                    key={key}
                    placeholder={key}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                ))}
              </div>

              <div className="actions-row">
                <button className="primary" onClick={enregistrer}>
                  Enregistrer
                </button>
                <button className="secondary" onClick={() => setShowForm(false)}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          <div className="list">
            {filtered.length === 0 ? (
              <p className="muted">Aucun bénéficiaire trouvé.</p>
            ) : (
              filtered.map((b) => (
                <div key={b.id} onClick={() => setSelected(b)} className={`list-card hover-card ${selected?.id === b.id ? "selected" : ""}`}>
                  <h3>{b.nom} — {b.age} ans</h3>
                  <p><strong>Profil :</strong> {b.profil}</p>
                  <p><strong>Ville :</strong> {b.ville}</p>
                  <p><strong>Priorité :</strong> {b.priorite}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <FicheDetaillee
          beneficiaire={selected}
          actions={actions}
          actionForm={actionForm}
          setActionForm={setActionForm}
          ajouterAction={ajouterAction}
          ouvrirModification={ouvrirModification}
          supprimer={supprimer}
          exporterPDF={exporterPDF}
        />
      </div>
    </section>
  );
}

function FicheDetaillee({
  beneficiaire,
  actions,
  actionForm,
  setActionForm,
  ajouterAction,
  ouvrirModification,
  supprimer,
  exporterPDF,
}) {
  if (!beneficiaire) {
    return <div className="panel detail">Aucun bénéficiaire sélectionné.</div>;
  }

  return (
    <aside className="panel detail scale-in">
      <h2>Fiche détaillée</h2>
      <h3>{beneficiaire.nom}</h3>

      <button className="primary" onClick={exporterPDF}>Exporter la fiche en PDF</button>

      <p><strong>Âge :</strong> {beneficiaire.age}</p>
      <p><strong>Profil :</strong> {beneficiaire.profil}</p>
      <p><strong>Ville :</strong> {beneficiaire.ville}</p>
      <p><strong>Adresse :</strong> {beneficiaire.adresse || "Non renseignée"}</p>
      <p><strong>Téléphone :</strong> {beneficiaire.telephone || "Non renseigné"}</p>
      <p><strong>Email :</strong> {beneficiaire.email || "Non renseigné"}</p>
      <p><strong>Référent :</strong> {beneficiaire.referent || "Non renseigné"}</p>
      <p><strong>Priorité :</strong> {beneficiaire.priorite || "Non renseignée"}</p>
      <p><strong>Besoins :</strong> {beneficiaire.besoin || "Non renseignés"}</p>

      <div className="note">{beneficiaire.notes || "Aucune note renseignée."}</div>

      <button className="secondary" onClick={() => ouvrirModification(beneficiaire)}>
        Modifier cette fiche
      </button>

      <button className="danger" onClick={() => supprimer(beneficiaire)}>
        Supprimer ce bénéficiaire
      </button>

      <hr />

      <h3>Ajouter une action</h3>

      <input type="date" value={actionForm.date} onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })} />

      <select value={actionForm.type} onChange={(e) => setActionForm({ ...actionForm, type: e.target.value })}>
        <option value="">Type d’action</option>
        <option value="Appel">Appel</option>
        <option value="Visite">Visite</option>
        <option value="Dossier administratif">Dossier administratif</option>
        <option value="Aide alimentaire">Aide alimentaire</option>
        <option value="Santé">Santé</option>
        <option value="Logement">Logement</option>
        <option value="Autre">Autre</option>
      </select>

      <textarea
        placeholder="Description de l’action..."
        value={actionForm.description}
        onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
      />

      <button className="primary" onClick={ajouterAction}>Ajouter l’action</button>

      <hr />

      <h3>Historique</h3>

      {actions.length === 0 ? (
        <p className="muted">Aucune action enregistrée.</p>
      ) : (
        actions.map((action) => (
          <div key={action.id} className="history-card">
            <p><strong>{action.date}</strong> — {action.type}</p>
            <p>{action.description}</p>
          </div>
        ))
      )}
    </aside>
  );
}

function Actions() {
  return <section className="fade-in"><h1>Actions</h1><div className="panel">Les actions sont consultables dans chaque fiche bénéficiaire.</div></section>;
}

function Documents() {
  return <section className="fade-in"><h1>Documents</h1><div className="panel">Module documents à développer ensuite.</div></section>;
}

function Securite() {
  return <section className="fade-in"><h1>Confidentialité</h1><div className="panel">Connexion sécurisée, mots de passe chiffrés et API protégée par token.</div></section>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      :root {
        --blue: #2563eb;
        --blue-dark: #0f4c81;
        --green: #22c55e;
        --red: #ef4444;
      }

      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
      }

      .theme-dark {
        --bg: #07111f;
        --surface: rgba(15, 23, 42, 0.82);
        --surface-2: rgba(30, 41, 59, 0.8);
        --text: #e5e7eb;
        --muted: #94a3b8;
        --border: rgba(148, 163, 184, 0.22);
        --input: rgba(15, 23, 42, 0.9);
      }

      .theme-light {
        --bg: #f4f7fb;
        --surface: #ffffff;
        --surface-2: #f8fafc;
        --text: #0f172a;
        --muted: #64748b;
        --border: #e5e7eb;
        --input: #ffffff;
      }

      .app {
        display: flex;
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(37,99,235,0.28), transparent 30%),
          radial-gradient(circle at bottom right, rgba(34,197,94,0.18), transparent 28%),
          var(--bg);
        color: var(--text);
      }

      .auth-page {
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(37,99,235,0.4), transparent 32%),
          linear-gradient(135deg, #07111f, #0f4c81);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text);
      }

      .auth-card {
        width: 410px;
        padding: 34px;
        border-radius: 28px;
        background: rgba(15, 23, 42, 0.86);
        backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 30px 90px rgba(0,0,0,0.35);
      }

      .auth-logo {
        width: 90px;
        height: 90px;
        object-fit: contain;
        background: white;
        padding: 8px;
        border-radius: 22px;
      }

      .auth-card input,
      .auth-card button {
        margin-top: 12px;
      }

      .sidebar {
        width: 310px;
        padding: 24px;
        background: rgba(2, 6, 23, 0.72);
        backdrop-filter: blur(20px);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
      }

      .brand-logo {
        width: 68px;
        height: 68px;
        object-fit: contain;
        background: white;
        padding: 6px;
        border-radius: 18px;
        box-shadow: 0 12px 30px rgba(37,99,235,0.25);
      }

      .brand h2 {
        margin: 0;
        font-size: 22px;
      }

      .badge {
        display: inline-block;
        margin-top: 6px;
        background: rgba(34,197,94,0.18);
        color: #86efac;
        border: 1px solid rgba(34,197,94,0.35);
        font-size: 12px;
        padding: 4px 9px;
        border-radius: 999px;
      }

      nav { margin-top: 28px; }

      .sidebar button {
        display: block;
        width: 100%;
        margin-bottom: 10px;
        text-align: left;
        color: var(--text);
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
      }

      .sidebar button:hover,
      .sidebar button.active {
        background: linear-gradient(135deg, var(--blue), #38bdf8);
        color: white;
        transform: translateX(4px);
      }

      .main {
        flex: 1;
        padding: 28px;
        overflow-x: auto;
      }

      .top-header {
        background: linear-gradient(135deg, rgba(15,76,129,0.98), rgba(37,99,235,0.94));
        color: white;
        border-radius: 28px;
        padding: 28px 32px;
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 24px 60px rgba(37, 99, 235, 0.28);
      }

      .top-header h1 {
        margin: 4px 0 0;
        font-size: 31px;
      }

      .eyebrow {
        margin: 0;
        color: #bfdbfe;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
      }

      .header-right {
        display: flex;
        gap: 10px;
        align-items: center;
        background: rgba(255,255,255,0.14);
        padding: 10px 12px;
        border-radius: 999px;
        flex-wrap: wrap;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        background: #22c55e;
        border-radius: 50%;
        box-shadow: 0 0 0 6px rgba(34,197,94,0.18);
      }

      .header-user,
      .theme-toggle {
        background: white;
        color: #0f4c81;
        padding: 7px 10px;
        border-radius: 999px;
        font-weight: bold;
      }

      button {
        border: none;
        cursor: pointer;
        border-radius: 14px;
        padding: 12px 15px;
        font-size: 15px;
        transition: all 0.22s ease;
      }

      button:hover {
        transform: translateY(-1px);
      }

      .primary {
        background: linear-gradient(135deg, #2563eb, #38bdf8);
        color: white;
        box-shadow: 0 12px 28px rgba(37,99,235,0.25);
      }

      .secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .danger {
        background: rgba(239, 68, 68, 0.16) !important;
        color: #fecaca !important;
        border: 1px solid rgba(239,68,68,0.35) !important;
      }

      input, textarea, select {
        width: 100%;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 14px;
        font-size: 15px;
        background: var(--input);
        color: var(--text);
        outline: none;
      }

      input:focus, textarea:focus, select:focus {
        border-color: #38bdf8;
        box-shadow: 0 0 0 4px rgba(56,189,248,0.12);
      }

      textarea {
        min-height: 90px;
        resize: vertical;
      }

      h1, h2, h3, p {
        color: var(--text);
      }

      .muted {
        color: var(--muted);
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 20px;
      }

      .card, .panel, .list-card, .history-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: 0 18px 50px rgba(0,0,0,0.18);
        backdrop-filter: blur(14px);
      }

      .card {
        padding: 28px;
      }

      .card p {
        color: var(--muted);
        margin: 0 0 10px;
      }

      .card h2 {
        font-size: 34px;
        margin: 0;
        color: #60a5fa;
      }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(340px, 1fr) 520px;
        gap: 24px;
        align-items: start;
      }

      .search {
        margin-bottom: 18px;
      }

      .panel {
        padding: 24px;
      }

      .form-panel {
        margin-bottom: 22px;
      }

      .grid-form {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 12px;
      }

      .actions-row {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }

      .actions-row button {
        flex: 1;
      }

      .list {
        display: grid;
        gap: 14px;
      }

      .list-card {
        padding: 18px;
        cursor: pointer;
      }

      .list-card.selected {
        border-color: #38bdf8;
        background: rgba(37,99,235,0.16);
      }

      .hover-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 24px 70px rgba(37,99,235,0.22);
      }

      .detail {
        position: sticky;
        top: 24px;
      }

      .detail input,
      .detail select,
      .detail textarea,
      .detail button {
        margin-top: 10px;
      }

      .note {
        background: rgba(250, 204, 21, 0.12);
        border: 1px solid rgba(250, 204, 21, 0.25);
        padding: 14px;
        border-radius: 14px;
        margin: 14px 0;
      }

      .history-card {
        background: rgba(15,23,42,0.25);
        padding: 14px;
        margin-bottom: 10px;
      }

      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 14px 18px;
        border-radius: 16px;
        color: white;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
        animation: slideDown 0.25s ease;
      }

      .toast.success { background: #16a34a; }
      .toast.error { background: #dc2626; }

      hr {
        border: none;
        border-top: 1px solid var(--border);
        margin: 18px 0;
      }

      .fade-in {
        animation: fadeIn 0.35s ease both;
      }

      .scale-in {
        animation: scaleIn 0.25s ease both;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (max-width: 950px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; min-height: auto; }
        .layout { grid-template-columns: 1fr; }
        .detail { position: static; }
        .cards { grid-template-columns: 1fr; }
        .grid-form { grid-template-columns: 1fr; }
        .top-header { flex-direction: column; align-items: flex-start; gap: 14px; }
      }
    `}</style>
  );
}