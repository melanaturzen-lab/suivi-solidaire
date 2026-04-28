import React, { useEffect, useMemo, useState } from "react";
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
              <span className="badge-production">Production</span>
            </div>
          </div>

          <p className="muted user-line">Connecté : {user?.email}</p>

          <nav>
            {[
              ["dashboard", "Tableau de bord"],
              ["beneficiaires", "Bénéficiaires"],
              ["accompagnement", "Accompagnement"],
              ["actions", "Actions"],
              ["documents", "Documents"],
              ["securite", "Confidentialité"],
            ].map(([key, label]) => (
              <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
                {label}
              </button>
            ))}
          </nav>
        </div>

        <button className="danger" onClick={deconnexion}>
          Déconnexion
        </button>
      </aside>

      <main className="main">
        <HeaderPro user={user} theme={theme} setTheme={setTheme} />

        {loading && <SkeletonDashboard />}

        {!loading && page === "dashboard" && <Dashboard beneficiaires={beneficiaires} />}
        {!loading && page === "beneficiaires" && (
          <Beneficiaires
            beneficiaires={beneficiaires}
            chargerBeneficiaires={chargerBeneficiaires}
            authHeaders={authHeaders}
            showToast={showToast}
          />
        )}
        {!loading && page === "accompagnement" && (
          <Accompagnement
            beneficiaires={beneficiaires}
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
      showToast("Connexion réussie.");
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

function SkeletonDashboard() {
  return (
    <section className="fade-in">
      <div className="skeleton skeleton-title"></div>
      <div className="cards">
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </div>
    </section>
  );
}

function Dashboard({ beneficiaires }) {
  const stats = useMemo(() => {
    const urgents = beneficiaires.filter((b) => {
      const p = (b.priorite || "").toLowerCase();
      return p.includes("haute") || p.includes("élevée") || p.includes("urgent");
    }).length;

    const villes = new Set(beneficiaires.map((b) => b.ville).filter(Boolean)).size;
    const complets = beneficiaires.filter((b) => b.telephone || b.email || b.adresse).length;

    return {
      total: beneficiaires.length,
      urgents,
      villes,
      completude: beneficiaires.length ? Math.round((complets / beneficiaires.length) * 100) : 0,
    };
  }, [beneficiaires]);

  return (
    <section className="fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow local">Vue globale</p>
          <h1>Tableau de bord</h1>
        </div>
      </div>

      <div className="cards">
        <Card title="Bénéficiaires" value={stats.total} subtitle="Fiches actives" />
        <Card title="Situations urgentes" value={stats.urgents} subtitle="Priorité élevée" />
        <Card title="Villes couvertes" value={stats.villes} subtitle="Zones suivies" />
      </div>

      <div className="premium-grid">
        <div className="panel">
          <h2>Qualité des dossiers</h2>
          <p className="muted">Fiches avec au moins un contact ou une adresse.</p>
          <div className="progress">
            <div style={{ width: `${stats.completude}%` }}></div>
          </div>
          <h3>{stats.completude}% complètes</h3>
        </div>

        <div className="panel">
          <h2>Priorités récentes</h2>
          {beneficiaires.slice(0, 5).map((b) => (
            <div key={b.id} className="mini-row">
              <span>{b.nom || "Sans nom"}</span>
              <BadgePriorite value={b.priorite} />
            </div>
          ))}
          {beneficiaires.length === 0 && <p className="muted">Aucune fiche pour le moment.</p>}
        </div>
      </div>
    </section>
  );
}

function Card({ title, value, subtitle }) {
  return (
    <div className="card hover-card">
      <p>{title}</p>
      <h2>{value}</h2>
      <span className="muted">{subtitle}</span>
    </div>
  );
}

function BadgePriorite({ value }) {
  const label = value || "Non renseignée";
  const clean = label.toLowerCase();

  let cls = "badge-soft";
  if (clean.includes("haute") || clean.includes("élevée") || clean.includes("urgent")) cls = "badge-danger";
  else if (clean.includes("moyenne")) cls = "badge-warning";
  else if (clean.includes("basse") || clean.includes("faible")) cls = "badge-success";

  return <span className={cls}>{label}</span>;
}

function BadgeStatut({ value }) {
  const label = value || "Ouvert";
  const clean = label.toLowerCase();

  let cls = "badge-soft";
  if (clean.includes("clos") || clean.includes("termin")) cls = "badge-success";
  else if (clean.includes("urgent") || clean.includes("bloqu")) cls = "badge-danger";
  else if (clean.includes("attente") || clean.includes("cours")) cls = "badge-warning";

  return <span className={cls}>{label}</span>;
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

  async function exporterPDF() {
    if (!selected) return;

    const doc = new jsPDF("p", "mm", "a4");
    doc.setFillColor(15, 76, 129);
    doc.rect(0, 0, 210, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("Suivi Solidaire", 14, 16);
    doc.setFontSize(11);
    doc.text("La Voix des Ancêtres — Fiche bénéficiaire", 14, 25);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(16);
    doc.text(selected.nom || "Bénéficiaire", 14, 50);

    let y = 68;

    function row(label, value) {
      doc.setFont(undefined, "bold");
      doc.text(`${label} :`, 14, y);
      doc.setFont(undefined, "normal");
      doc.text(String(value || "Non renseigné"), 55, y);
      y += 7;
    }

    row("Âge", selected.age);
    row("Profil", selected.profil);
    row("Ville", selected.ville);
    row("Adresse", selected.adresse);
    row("Téléphone", selected.telephone);
    row("Email", selected.email);
    row("Référent", selected.referent);
    row("Priorité", selected.priorite);
    row("Besoins", selected.besoin);

    doc.setFont(undefined, "bold");
    doc.text("Notes :", 14, y + 4);
    y += 12;
    doc.setFont(undefined, "normal");
    doc.text(doc.splitTextToSize(selected.notes || "Aucune note renseignée.", 175), 14, y);

    doc.save(`fiche-${selected.nom || "beneficiaire"}.pdf`);
    showToast("PDF exporté avec succès.");
  }

  return (
    <section className="fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow local">Suivi social</p>
          <h1>Bénéficiaires</h1>
        </div>
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
                <button className="primary" onClick={enregistrer}>Enregistrer</button>
                <button className="secondary" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }}>
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
                  className={`list-card hover-card ${selected?.id === b.id ? "selected" : ""}`}
                >
                  <div className="list-card-top">
                    <h3>{b.nom} — {b.age} ans</h3>
                    <BadgePriorite value={b.priorite} />
                  </div>
                  <p><strong>Profil :</strong> {b.profil}</p>
                  <p><strong>Ville :</strong> {b.ville}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="panel detail scale-in">
          {!selected ? (
            <>
              <h2>Aucun bénéficiaire sélectionné</h2>
              <p className="muted">Sélectionne une fiche ou ajoute un nouveau bénéficiaire.</p>
            </>
          ) : (
            <>
              <div className="profile-head">
                <div>
                  <h2>{selected.nom}</h2>
                  <p className="muted">{selected.profil || "Profil non renseigné"}</p>
                </div>
                <BadgePriorite value={selected.priorite} />
              </div>

              <button className="primary" onClick={exporterPDF}>Exporter la fiche en PDF</button>

              <div className="info-grid">
                <p><strong>Âge :</strong> {selected.age}</p>
                <p><strong>Ville :</strong> {selected.ville}</p>
                <p><strong>Adresse :</strong> {selected.adresse || "Non renseignée"}</p>
                <p><strong>Téléphone :</strong> {selected.telephone || "Non renseigné"}</p>
                <p><strong>Email :</strong> {selected.email || "Non renseigné"}</p>
                <p><strong>Référent :</strong> {selected.referent || "Non renseigné"}</p>
              </div>

              <hr />
              <p><strong>Besoins :</strong> {selected.besoin || "Non renseignés"}</p>
              <div className="note">{selected.notes || "Aucune note renseignée."}</div>

              <button className="secondary" onClick={() => ouvrirModification(selected)}>Modifier cette fiche</button>
              <button className="danger" onClick={() => supprimer(selected)}>Supprimer ce bénéficiaire</button>

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
              <h3>Timeline</h3>

              {actions.length === 0 ? (
                <p className="muted">Aucune action enregistrée.</p>
              ) : (
                <div className="timeline">
                  {actions.map((action) => (
                    <div key={action.id} className="timeline-item">
                      <div className="timeline-dot"></div>
                      <div className="history-card">
                        <p><strong>{action.date}</strong> — {action.type}</p>
                        <p>{action.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

function Accompagnement({ beneficiaires, authHeaders, showToast }) {
  const [tab, setTab] = useState("entretiens");
  const [entretiens, setEntretiens] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [entretienForm, setEntretienForm] = useState(emptyEntretien);
  const [dossierForm, setDossierForm] = useState(emptyDossier);

  async function chargerEntretiens() {
    try {
      const res = await fetch(`${API_URL}/entretiens`, { headers: authHeaders() });
      const data = await res.json();
      setEntretiens(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast("Impossible de charger les entretiens.", "error");
    }
  }

  async function chargerDossiers() {
    try {
      const res = await fetch(`${API_URL}/dossiers-instruction`, { headers: authHeaders() });
      const data = await res.json();
      setDossiers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      showToast("Impossible de charger les dossiers.", "error");
    }
  }

  useEffect(() => {
    chargerEntretiens();
    chargerDossiers();
  }, []);

  async function ajouterEntretien() {
    if (!entretienForm.beneficiaire_id || !entretienForm.date || !entretienForm.type) {
      showToast("Choisis un bénéficiaire, une date et un type d’entretien.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/entretiens`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(entretienForm),
      });

      if (!res.ok) throw new Error();

      setEntretienForm(emptyEntretien);
      await chargerEntretiens();
      showToast("Entretien ajouté.");
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l’ajout de l’entretien.", "error");
    }
  }

  async function supprimerEntretien(id) {
    if (!window.confirm("Supprimer cet entretien ?")) return;

    try {
      const res = await fetch(`${API_URL}/entretiens/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error();

      await chargerEntretiens();
      showToast("Entretien supprimé.");
    } catch (error) {
      console.error(error);
      showToast("Erreur suppression entretien.", "error");
    }
  }

  async function ajouterDossier() {
    if (!dossierForm.beneficiaire_id || !dossierForm.type) {
      showToast("Choisis un bénéficiaire et un type de dossier.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/dossiers-instruction`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(dossierForm),
      });

      if (!res.ok) throw new Error();

      setDossierForm(emptyDossier);
      await chargerDossiers();
      showToast("Dossier d’instruction ajouté.");
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l’ajout du dossier.", "error");
    }
  }

  async function supprimerDossier(id) {
    if (!window.confirm("Supprimer ce dossier ?")) return;

    try {
      const res = await fetch(`${API_URL}/dossiers-instruction/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error();

      await chargerDossiers();
      showToast("Dossier supprimé.");
    } catch (error) {
      console.error(error);
      showToast("Erreur suppression dossier.", "error");
    }
  }

  return (
    <section className="fade-in">
      <div className="page-header">
        <div>
          <p className="eyebrow local">Suivi approfondi</p>
          <h1>Accompagnement</h1>
        </div>
      </div>

      <div className="tabs">
        <button className={tab === "entretiens" ? "active-tab" : ""} onClick={() => setTab("entretiens")}>
          Entretiens
        </button>
        <button className={tab === "dossiers" ? "active-tab" : ""} onClick={() => setTab("dossiers")}>
          Dossiers d’instruction
        </button>
      </div>

      {tab === "entretiens" && (
        <div className="accompagnement-grid">
          <div className="panel">
            <h2>Nouvel entretien</h2>

            <select
              value={entretienForm.beneficiaire_id}
              onChange={(e) => setEntretienForm({ ...entretienForm, beneficiaire_id: e.target.value })}
            >
              <option value="">Choisir un bénéficiaire</option>
              {beneficiaires.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>

            <input
              type="date"
              value={entretienForm.date}
              onChange={(e) => setEntretienForm({ ...entretienForm, date: e.target.value })}
            />

            <select
              value={entretienForm.type}
              onChange={(e) => setEntretienForm({ ...entretienForm, type: e.target.value })}
            >
              <option value="">Type d’entretien</option>
              <option value="Premier accueil">Premier accueil</option>
              <option value="Suivi social">Suivi social</option>
              <option value="Entretien téléphonique">Entretien téléphonique</option>
              <option value="Entretien administratif">Entretien administratif</option>
              <option value="Autre">Autre</option>
            </select>

            <textarea
              placeholder="Compte-rendu de l’entretien..."
              value={entretienForm.compte_rendu}
              onChange={(e) => setEntretienForm({ ...entretienForm, compte_rendu: e.target.value })}
            />

            <textarea
              placeholder="Suite à donner..."
              value={entretienForm.suite_a_donner}
              onChange={(e) => setEntretienForm({ ...entretienForm, suite_a_donner: e.target.value })}
            />

            <button className="primary" onClick={ajouterEntretien}>Ajouter l’entretien</button>
          </div>

          <div className="panel">
            <h2>Historique des entretiens</h2>

            {entretiens.length === 0 ? (
              <p className="muted">Aucun entretien enregistré.</p>
            ) : (
              <div className="timeline">
                {entretiens.map((e) => (
                  <div key={e.id} className="timeline-item">
                    <div className="timeline-dot"></div>
                    <div className="history-card">
                      <div className="list-card-top">
                        <p><strong>{e.date}</strong> — {e.type}</p>
                        <button className="mini-danger" onClick={() => supprimerEntretien(e.id)}>Supprimer</button>
                      </div>
                      <p className="muted">{e.beneficiaires?.nom || "Bénéficiaire"}</p>
                      <p>{e.compte_rendu || "Aucun compte-rendu."}</p>
                      <p><strong>Suite :</strong> {e.suite_a_donner || "Non renseignée"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "dossiers" && (
        <div className="accompagnement-grid">
          <div className="panel">
            <h2>Nouveau dossier d’instruction</h2>

            <select
              value={dossierForm.beneficiaire_id}
              onChange={(e) => setDossierForm({ ...dossierForm, beneficiaire_id: e.target.value })}
            >
              <option value="">Choisir un bénéficiaire</option>
              {beneficiaires.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>

            <input
              placeholder="Type de dossier"
              value={dossierForm.type}
              onChange={(e) => setDossierForm({ ...dossierForm, type: e.target.value })}
            />

            <select
              value={dossierForm.statut}
              onChange={(e) => setDossierForm({ ...dossierForm, statut: e.target.value })}
            >
              <option value="Ouvert">Ouvert</option>
              <option value="En cours">En cours</option>
              <option value="En attente">En attente</option>
              <option value="Urgent">Urgent</option>
              <option value="Clos">Clos</option>
            </select>

            <input
              type="date"
              value={dossierForm.date_ouverture}
              onChange={(e) => setDossierForm({ ...dossierForm, date_ouverture: e.target.value })}
            />

            <input
              type="date"
              value={dossierForm.echeance}
              onChange={(e) => setDossierForm({ ...dossierForm, echeance: e.target.value })}
            />

            <textarea
              placeholder="Notes du dossier..."
              value={dossierForm.notes}
              onChange={(e) => setDossierForm({ ...dossierForm, notes: e.target.value })}
            />

            <button className="primary" onClick={ajouterDossier}>Ajouter le dossier</button>
          </div>

          <div className="panel">
            <h2>Dossiers d’instruction</h2>

            {dossiers.length === 0 ? (
              <p className="muted">Aucun dossier enregistré.</p>
            ) : (
              <div className="list">
                {dossiers.map((d) => (
                  <div key={d.id} className="history-card">
                    <div className="list-card-top">
                      <h3>{d.type}</h3>
                      <BadgeStatut value={d.statut} />
                    </div>
                    <p className="muted">{d.beneficiaires?.nom || "Bénéficiaire"}</p>
                    <p><strong>Ouverture :</strong> {d.date_ouverture || "Non renseignée"}</p>
                    <p><strong>Échéance :</strong> {d.echeance || "Non renseignée"}</p>
                    <p>{d.notes || "Aucune note."}</p>
                    <button className="mini-danger" onClick={() => supprimerDossier(d.id)}>Supprimer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Actions() {
  return (
    <section className="fade-in">
      <h1>Actions</h1>
      <div className="panel">
        <p>Les actions sont consultables dans chaque fiche bénéficiaire.</p>
      </div>
    </section>
  );
}

function Documents() {
  return (
    <section className="fade-in">
      <h1>Documents</h1>
      <div className="panel">
        <p>Module documents à développer ensuite.</p>
      </div>
    </section>
  );
}

function Securite() {
  return (
    <section className="fade-in">
      <h1>Confidentialité</h1>
      <div className="panel">
        <p>Connexion sécurisée, mots de passe chiffrés, API protégée par token et RLS Supabase activé.</p>
      </div>
    </section>
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

      body { margin: 0; font-family: Inter, Arial, sans-serif; }

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
        background: linear-gradient(135deg, #07111f, #0f4c81);
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
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 30px 90px rgba(0,0,0,0.35);
      }

      .auth-logo, .brand-logo {
        object-fit: contain;
        background: white;
        padding: 8px;
        border-radius: 22px;
      }

      .auth-logo { width: 90px; height: 90px; }
      .brand-logo { width: 68px; height: 68px; }

      .auth-card input, .auth-card button { margin-top: 12px; }

      .sidebar {
        width: 310px;
        padding: 24px;
        background: rgba(2, 6, 23, 0.72);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
      .brand h2 { margin: 0; font-size: 22px; }

      .badge-production {
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
      .sidebar button.active,
      .active-tab {
        background: linear-gradient(135deg, #2563eb, #38bdf8) !important;
        color: white !important;
      }

      .main { flex: 1; padding: 28px; overflow-x: auto; }

      .top-header {
        background: linear-gradient(135deg, rgba(15,76,129,0.98), rgba(37,99,235,0.94));
        color: white;
        border-radius: 28px;
        padding: 28px 32px;
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .top-header h1 { margin: 4px 0 0; font-size: 31px; color: white; }

      .eyebrow {
        margin: 0;
        color: #bfdbfe;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
      }

      .eyebrow.local { color: #60a5fa; }

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
      }

      .header-user, .theme-toggle {
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

      button:hover { transform: translateY(-1px); }

      .primary {
        background: linear-gradient(135deg, #2563eb, #38bdf8);
        color: white;
      }

      .secondary {
        background: var(--surface-2);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .danger, .mini-danger {
        background: rgba(239, 68, 68, 0.16) !important;
        color: #fecaca !important;
        border: 1px solid rgba(239,68,68,0.35) !important;
      }

      .mini-danger {
        padding: 7px 10px;
        font-size: 12px;
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
        margin-top: 10px;
      }

      textarea { min-height: 90px; resize: vertical; }

      h1, h2, h3, p, span { color: var(--text); }
      .muted { color: var(--muted); }

      .cards {
        display: grid;
        grid-template-columns: repeat(3, minmax(180px, 1fr));
        gap: 20px;
      }

      .premium-grid, .accompagnement-grid {
        margin-top: 24px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
      }

      .card, .panel, .list-card, .history-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 24px;
        box-shadow: 0 18px 50px rgba(0,0,0,0.18);
      }

      .card, .panel { padding: 24px; }
      .card h2 { font-size: 34px; margin: 0; color: #60a5fa; }

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

      .search { margin-bottom: 18px; }

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

      .list { display: grid; gap: 14px; }

      .list-card {
        padding: 18px;
        cursor: pointer;
      }

      .list-card-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }

      .list-card.selected {
        border-color: #38bdf8;
        background: rgba(37,99,235,0.16);
      }

      .hover-card:hover {
        transform: translateY(-4px);
      }

      .detail {
        position: sticky;
        top: 24px;
      }

      .profile-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
      }

      .note {
        background: rgba(250, 204, 21, 0.12);
        border: 1px solid rgba(250, 204, 21, 0.25);
        padding: 14px;
        border-radius: 14px;
        margin: 14px 0;
      }

      .timeline { display: grid; gap: 12px; }

      .timeline-item {
        display: grid;
        grid-template-columns: 18px 1fr;
        gap: 10px;
        align-items: start;
      }

      .timeline-dot {
        width: 12px;
        height: 12px;
        margin-top: 18px;
        border-radius: 50%;
        background: #38bdf8;
      }

      .history-card {
        background: rgba(15,23,42,0.25);
        padding: 14px;
      }

      .tabs {
        display: flex;
        gap: 12px;
        margin: 20px 0;
      }

      .tabs button {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
      }

      .badge-soft, .badge-danger, .badge-warning, .badge-success {
        display: inline-flex;
        font-size: 12px;
        padding: 5px 9px;
        border-radius: 999px;
        white-space: nowrap;
      }

      .badge-soft {
        background: rgba(148,163,184,0.16);
        color: var(--muted);
        border: 1px solid rgba(148,163,184,0.28);
      }

      .badge-danger {
        background: rgba(239,68,68,0.14);
        color: #fecaca;
        border: 1px solid rgba(239,68,68,0.35);
      }

      .badge-warning {
        background: rgba(245,158,11,0.14);
        color: #fde68a;
        border: 1px solid rgba(245,158,11,0.35);
      }

      .badge-success {
        background: rgba(34,197,94,0.14);
        color: #bbf7d0;
        border: 1px solid rgba(34,197,94,0.35);
      }

      .progress {
        width: 100%;
        height: 12px;
        background: rgba(148,163,184,0.2);
        border-radius: 999px;
        overflow: hidden;
        margin: 18px 0;
      }

      .progress div {
        height: 100%;
        background: linear-gradient(135deg, #2563eb, #22c55e);
      }

      .mini-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }

      .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 14px 18px;
        border-radius: 16px;
        color: white;
        animation: slideDown 0.25s ease;
      }

      .toast.success { background: #16a34a; }
      .toast.error { background: #dc2626; }

      .skeleton {
        background: linear-gradient(90deg, rgba(148,163,184,0.15), rgba(148,163,184,0.32), rgba(148,163,184,0.15));
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
        border-radius: 20px;
      }

      .skeleton-title { width: 260px; height: 42px; margin-bottom: 24px; }
      .skeleton-card { height: 140px; }

      hr {
        border: none;
        border-top: 1px solid var(--border);
        margin: 18px 0;
      }

      .fade-in { animation: fadeIn 0.35s ease both; }
      .scale-in { animation: scaleIn 0.25s ease both; }

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

      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (max-width: 950px) {
        .app { flex-direction: column; }
        .sidebar { width: 100%; min-height: auto; }
        .layout, .premium-grid, .accompagnement-grid { grid-template-columns: 1fr; }
        .detail { position: static; }
        .cards { grid-template-columns: 1fr; }
        .grid-form, .info-grid { grid-template-columns: 1fr; }
        .top-header { flex-direction: column; align-items: flex-start; gap: 14px; }
      }
    `}</style>
  );
}