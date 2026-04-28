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

  const [page, setPage] = useState("dashboard");
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

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
      <>
        <AuthPage setToken={setToken} setUser={setUser} showToast={showToast} />
        <Toast toast={toast} />
        <GlobalStyles />
      </>
    );
  }

  return (
    <div className="app">
      <Toast toast={toast} />

      <aside className="sidebar">
        <div>
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <h2>Suivi Solidaire</h2>
          <p className="muted">Connecté : {user?.email}</p>
        </div>

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

        <button className="danger" onClick={deconnexion}>
          Déconnexion
        </button>
      </aside>

      <main className="main">
        {loading && <p>Chargement...</p>}

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

function AuthPage({ setToken, setUser, showToast }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    nom: "",
    email: "",
    password: "",
  });

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
      <form className="auth-card" onSubmit={submit}>
        <img src={logo} alt="Logo" className="auth-logo" />
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

        <button type="submit" className="primary">
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
  const urgents = beneficiaires.filter((b) => b.priorite === "Élevée").length;

  return (
    <>
      <h1>Tableau de bord</h1>

      <div className="cards">
        <Card title="Bénéficiaires" value={beneficiaires.length} />
        <Card title="Situations urgentes" value={urgents} />
        <Card title="Backend" value="En ligne" />
      </div>
    </>
  );
}

function Card({ title, value }) {
  return (
    <div className="card">
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
    `${b.nom || ""} ${b.ville || ""} ${b.profil || ""} ${b.besoin || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!selected && beneficiaires.length > 0) {
      setSelected(beneficiaires[0]);
    }
  }, [beneficiaires, selected]);

  useEffect(() => {
    if (selected?.id) {
      chargerActions(selected.id);
    }
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

    const url =
      editId === null
        ? `${API_URL}/beneficiaires`
        : `${API_URL}/beneficiaires/${editId}`;

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

      showToast(
        editId === null ? "Bénéficiaire ajouté avec succès." : "Fiche modifiée avec succès.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showToast("Impossible d’enregistrer.", "error");
    }
  }

  async function supprimer(beneficiaire) {
    const confirmation = window.confirm(`Supprimer définitivement ${beneficiaire.nom} ?`);
    if (!confirmation) return;

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

      showToast("Bénéficiaire supprimé.", "success");
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

      showToast("Action ajoutée à l’historique.", "success");
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
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
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

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 34, "F");

    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 12, 7, 20, 20);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Suivi Solidaire", logoBase64 ? 38 : 14, 16);

    doc.setFontSize(11);
    doc.text("Fiche bénéficiaire", logoBase64 ? 38 : 14, 24);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text(selected.nom || "Bénéficiaire", 14, 48);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Export généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 55);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 60, 196, 60);

    let y = 72;

    function sectionTitle(title) {
      doc.setTextColor(37, 99, 235);
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
    showToast("PDF exporté avec succès.", "success");
  }

  return (
    <>
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
            <div className="panel form-panel">
              <h3>{editId === null ? "Nouveau bénéficiaire" : "Modifier le bénéficiaire"}</h3>

              <div className="grid-form">
                <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                <input placeholder="Âge" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                <input placeholder="Profil" value={form.profil} onChange={(e) => setForm({ ...form, profil: e.target.value })} />
                <input placeholder="Ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
                <input placeholder="Priorité" value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })} />
                <input placeholder="Besoins" value={form.besoin} onChange={(e) => setForm({ ...form, besoin: e.target.value })} />
                <input placeholder="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input placeholder="Adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
                <input placeholder="Référent" value={form.referent} onChange={(e) => setForm({ ...form, referent: e.target.value })} />
              </div>

              <textarea
                placeholder="Notes sociales"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />

              <div className="actions-row">
                <button className="primary" onClick={enregistrer}>
                  {editId === null ? "Enregistrer" : "Enregistrer les modifications"}
                </button>

                <button
                  className="secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditId(null);
                    setForm(emptyForm);
                  }}
                >
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
                <div
                  key={b.id}
                  onClick={() => setSelected(b)}
                  className={`list-card ${selected?.id === b.id ? "selected" : ""}`}
                >
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
    </>
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
    return (
      <div className="panel">
        <h2>Aucun bénéficiaire sélectionné</h2>
        <p className="muted">Ajoute un bénéficiaire ou sélectionne une fiche.</p>
      </div>
    );
  }

  return (
    <aside className="panel detail">
      <h2>Fiche détaillée</h2>

      <h3>{beneficiaire.nom}</h3>

      <button className="primary" onClick={exporterPDF}>
        Exporter la fiche en PDF
      </button>

      <p><strong>Âge :</strong> {beneficiaire.age}</p>
      <p><strong>Profil :</strong> {beneficiaire.profil}</p>
      <p><strong>Ville :</strong> {beneficiaire.ville}</p>
      <p><strong>Adresse :</strong> {beneficiaire.adresse || "Non renseignée"}</p>

      <hr />

      <p><strong>Téléphone :</strong> {beneficiaire.telephone || "Non renseigné"}</p>
      <p><strong>Email :</strong> {beneficiaire.email || "Non renseigné"}</p>
      <p><strong>Référent :</strong> {beneficiaire.referent || "Non renseigné"}</p>

      <hr />

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

      <input
        type="date"
        value={actionForm.date}
        onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
      />

      <select
        value={actionForm.type}
        onChange={(e) => setActionForm({ ...actionForm, type: e.target.value })}
      >
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

      <button className="primary" onClick={ajouterAction}>
        Ajouter l’action
      </button>

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
  return (
    <>
      <h1>Actions</h1>
      <div className="panel">
        <p>Les actions sont consultables dans chaque fiche bénéficiaire.</p>
      </div>
    </>
  );
}

function Documents() {
  return (
    <>
      <h1>Documents</h1>
      <div className="panel">
        <p>Module documents à développer ensuite.</p>
      </div>
    </>
  );
}

function Securite() {
  return (
    <>
      <h1>Confidentialité</h1>
      <div className="panel">
        <p>Connexion sécurisée, mots de passe chiffrés et API protégée par token.</p>
      </div>
    </>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f4f6f8;
        color: #111827;
      }

      .app {
        display: flex;
        min-height: 100vh;
        background: #f4f6f8;
      }

      .sidebar {
        width: 280px;
        background: #ffffff;
        padding: 24px;
        min-height: 100vh;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .sidebar-logo {
        width: 70px;
        height: 70px;
        object-fit: contain;
        margin-bottom: 12px;
      }

      .auth-logo {
        width: 80px;
        height: 80px;
        object-fit: contain;
        margin-bottom: 12px;
      }

      nav { margin-top: 24px; }

      .main {
        flex: 1;
        padding: 32px;
        overflow-x: auto;
      }

      button {
        border: none;
        cursor: pointer;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 15px;
        transition: 0.2s;
      }

      .sidebar button {
        display: block;
        width: 100%;
        margin-bottom: 10px;
        text-align: left;
        background: #eef3ff;
      }

      .sidebar button:hover,
      .sidebar button.active {
        background: #dbe7ff;
      }

      .primary { background: #2563eb; color: white; }
      .primary:hover { background: #1d4ed8; }

      .secondary { background: #eef2f7; color: #111827; }
      .secondary:hover { background: #e2e8f0; }

      .danger { background: #fee2e2 !important; color: #991b1b !important; }
      .danger:hover { background: #fecaca !important; }

      .small { width: auto; }

      input, textarea, select {
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        font-size: 15px;
        background: white;
      }

      textarea {
        min-height: 90px;
        resize: vertical;
      }

      .auth-page {
        min-height: 100vh;
        background: #f4f6f8;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .auth-card {
        background: white;
        width: 390px;
        padding: 32px;
        border-radius: 18px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);
      }

      .auth-card input,
      .auth-card button {
        margin-top: 10px;
      }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 20px;
      }

      .card,
      .panel,
      .list-card,
      .history-card {
        background: white;
        border-radius: 18px;
        box-shadow: 0 8px 25px rgba(15, 23, 42, 0.05);
      }

      .card { padding: 26px; }
      .card p { color: #6b7280; margin: 0 0 10px; }
      .card h2 { font-size: 34px; margin: 0; }

      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(340px, 1fr) 520px;
        gap: 24px;
        align-items: start;
      }

      .search { margin-bottom: 18px; }

      .panel { padding: 24px; }
      .form-panel { margin-bottom: 22px; }

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

      .actions-row button { flex: 1; }

      .list {
        display: grid;
        gap: 14px;
      }

      .list-card {
        padding: 18px;
        border: 2px solid transparent;
        cursor: pointer;
      }

      .list-card.selected {
        border-color: #2563eb;
        background: #eef3ff;
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
        background: #fff7df;
        padding: 14px;
        border-radius: 12px;
        margin: 14px 0;
      }

      .history-card {
        background: #f8fafc;
        padding: 14px;
        margin-bottom: 10px;
      }

      .muted { color: #6b7280; }

      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 14px 18px;
        border-radius: 12px;
        color: white;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.2);
      }

      .toast.success { background: #16a34a; }
      .toast.error { background: #dc2626; }

      hr {
        border: none;
        border-top: 1px solid #e5e7eb;
        margin: 18px 0;
      }

      @media (max-width: 950px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; min-height: auto; }
        .layout { grid-template-columns: 1fr; }
        .detail { position: static; }
        .cards { grid-template-columns: 1fr; }
        .grid-form { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}