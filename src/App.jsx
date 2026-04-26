import React, { useEffect, useState } from "react";

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
        alert("Session expirée. Merci de te reconnecter.");
        deconnexion();
        return;
      }

      const data = await response.json();
      setBeneficiaires(Array.isArray(data) ? data : []);
    } catch (error) {
      alert("Erreur : impossible de charger les bénéficiaires.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    chargerBeneficiaires();
  }, [token]);

  if (!token) {
    return <AuthPage setToken={setToken} setUser={setUser} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6f8", fontFamily: "Arial" }}>
      <div style={{ display: "flex" }}>
        <aside style={{ width: 260, background: "white", padding: 20, minHeight: "100vh" }}>
          <h2>Suivi Solidaire</h2>
          <p style={{ color: "#666" }}>Connecté : {user?.email}</p>

          <button onClick={() => setPage("dashboard")}>Tableau de bord</button>
          <button onClick={() => setPage("beneficiaires")}>Bénéficiaires</button>
          <button onClick={() => setPage("actions")}>Actions</button>
          <button onClick={() => setPage("documents")}>Documents</button>
          <button onClick={() => setPage("securite")}>Confidentialité</button>

          <button
            onClick={deconnexion}
            style={{ background: "#ffe5e5", color: "#900", marginTop: 30 }}
          >
            Déconnexion
          </button>
        </aside>

        <main style={{ flex: 1, padding: 30 }}>
          {loading && <p>Chargement...</p>}

          {!loading && page === "dashboard" && (
            <Dashboard beneficiaires={beneficiaires} />
          )}

          {!loading && page === "beneficiaires" && (
            <Beneficiaires
              beneficiaires={beneficiaires}
              chargerBeneficiaires={chargerBeneficiaires}
              authHeaders={authHeaders}
            />
          )}

          {!loading && page === "actions" && <Actions />}
          {!loading && page === "documents" && <Documents />}
          {!loading && page === "securite" && <Securite />}
        </main>
      </div>

      <GlobalStyles />
    </div>
  );
}

function AuthPage({ setToken, setUser }) {
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
        alert(data.error || "Erreur.");
        return;
      }

      if (mode === "register") {
        alert("Compte créé. Tu peux maintenant te connecter.");
        setMode("login");
        setForm({ nom: "", email: "", password: "" });
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setToken(data.token);
      setUser(data.user);
    } catch (error) {
      alert("Erreur de connexion au serveur.");
      console.error(error);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f4f6f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          background: "white",
          padding: 30,
          borderRadius: 12,
          width: 380,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
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

        <button type="submit">
          {mode === "login" ? "Se connecter" : "Créer le compte"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          style={{ background: "#eeeeee" }}
        >
          {mode === "login" ? "Créer un compte" : "J’ai déjà un compte"}
        </button>
      </form>

      <GlobalStyles />
    </div>
  );
}

function Dashboard({ beneficiaires }) {
  const urgents = beneficiaires.filter((b) => b.priorite === "Élevée").length;

  return (
    <>
      <h1>Tableau de bord</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        <Card title="Bénéficiaires" value={beneficiaires.length} />
        <Card title="Situations urgentes" value={urgents} />
        <Card title="Backend" value="En ligne" />
      </div>
    </>
  );
}

function Card({ title, value }) {
  return (
    <div style={{ background: "white", padding: 25, borderRadius: 12, marginBottom: 15 }}>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function Beneficiaires({ beneficiaires, chargerBeneficiaires, authHeaders }) {
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
      alert("Erreur : impossible de charger l’historique.");
      console.error(error);
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
      alert("Merci de remplir au moins le nom, l’âge et le profil.");
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
        alert("Erreur serveur lors de l’enregistrement.");
        return;
      }

      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      await chargerBeneficiaires();
    } catch (error) {
      alert("Erreur : impossible d’enregistrer.");
      console.error(error);
    }
  }

  async function supprimer(beneficiaire) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer ${beneficiaire.nom} ?`
    );

    if (!confirmation) return;

    try {
      const response = await fetch(`${API_URL}/beneficiaires/${beneficiaire.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!response.ok) {
        alert("Erreur serveur lors de la suppression.");
        return;
      }

      setSelected(null);
      setActions([]);
      await chargerBeneficiaires();
    } catch (error) {
      alert("Erreur : impossible de supprimer.");
      console.error(error);
    }
  }

  async function ajouterAction() {
    if (!selected) return;

    if (!actionForm.date || !actionForm.type || !actionForm.description) {
      alert("Merci de remplir la date, le type et la description.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/beneficiaires/${selected.id}/actions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(actionForm),
      });

      if (!response.ok) {
        alert("Erreur serveur lors de l’ajout de l’action.");
        return;
      }

      setActionForm(emptyAction);
      await chargerActions(selected.id);
    } catch (error) {
      alert("Erreur : impossible d’ajouter l’action.");
      console.error(error);
    }
  }

  return (
    <>
      <h1>Bénéficiaires</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 460px", gap: 20 }}>
        <div>
          <input
            placeholder="Rechercher un bénéficiaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button onClick={ouvrirAjout}>Ajouter un bénéficiaire</button>

          {showForm && (
            <div style={{ background: "white", padding: 20, borderRadius: 12, marginTop: 20 }}>
              <h3>{editId === null ? "Nouveau bénéficiaire" : "Modifier le bénéficiaire"}</h3>

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
              <textarea placeholder="Notes sociales" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              <button onClick={enregistrer}>
                {editId === null ? "Enregistrer" : "Enregistrer les modifications"}
              </button>

              <button
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
                style={{ background: "#eeeeee" }}
              >
                Annuler
              </button>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            {filtered.length === 0 ? (
              <p>Aucun bénéficiaire trouvé.</p>
            ) : (
              filtered.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelected(b)}
                  style={{
                    background: selected?.id === b.id ? "#eef3ff" : "white",
                    padding: 20,
                    borderRadius: 12,
                    marginBottom: 15,
                    cursor: "pointer",
                    border: selected?.id === b.id ? "2px solid #2f6fed" : "1px solid #ddd",
                  }}
                >
                  <h3>{b.nom} — {b.age} ans</h3>
                  <p><strong>Profil :</strong> {b.profil}</p>
                  <p><strong>Ville :</strong> {b.ville}</p>
                  <p><strong>Priorité :</strong> {b.priorite}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <FicheDetaillee
          beneficiaire={selected}
          actions={actions}
          actionForm={actionForm}
          setActionForm={setActionForm}
          ajouterAction={ajouterAction}
          ouvrirModification={ouvrirModification}
          supprimer={supprimer}
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
}) {
  if (!beneficiaire) {
    return (
      <div style={{ background: "white", padding: 25, borderRadius: 12 }}>
        <h2>Aucun bénéficiaire sélectionné</h2>
        <p>Ajoute un bénéficiaire ou sélectionne une fiche.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "white", padding: 25, borderRadius: 12, height: "fit-content" }}>
      <h2>Fiche détaillée</h2>

      <h3>{beneficiaire.nom}</h3>
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

      <p style={{ background: "#fff7df", padding: 12, borderRadius: 8 }}>
        {beneficiaire.notes || "Aucune note renseignée."}
      </p>

      <button onClick={() => ouvrirModification(beneficiaire)}>
        Modifier cette fiche
      </button>

      <button
        onClick={() => supprimer(beneficiaire)}
        style={{ background: "#ffe5e5", color: "#900" }}
      >
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
        placeholder="Description de l'action..."
        value={actionForm.description}
        onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
      />

      <button onClick={ajouterAction}>Ajouter l’action</button>

      <hr />

      <h3>Historique des actions</h3>

      {actions.length === 0 ? (
        <p>Aucune action enregistrée.</p>
      ) : (
        actions.map((action) => (
          <div
            key={action.id}
            style={{
              background: "#f4f6f8",
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <p>
              <strong>{action.date}</strong> — {action.type}
            </p>
            <p>{action.description}</p>
          </div>
        ))
      )}
    </div>
  );
}

function Actions() {
  return (
    <>
      <h1>Actions</h1>
      <p>Les actions sont consultables dans chaque fiche bénéficiaire.</p>
    </>
  );
}

function Documents() {
  return (
    <>
      <h1>Documents</h1>
      <p>Module documents à développer ensuite.</p>
    </>
  );
}

function Securite() {
  return (
    <>
      <h1>Confidentialité</h1>
      <p>Connexion sécurisée, mot de passe chiffré et API protégée par token.</p>
    </>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      button {
        display: block;
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        border-radius: 6px;
        border: none;
        background: #eef3ff;
        cursor: pointer;
        text-align: left;
      }

      button:hover {
        background: #dce8ff;
      }

      input, textarea, select {
        padding: 8px;
        margin: 5px 0;
        width: 90%;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-family: Arial;
      }

      textarea {
        min-height: 80px;
      }
    `}</style>
  );
}