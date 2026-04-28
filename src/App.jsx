import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [view, setView] = useState("dashboard");
  const [user, setUser] = useState(null);
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [accompagnements, setAccompagnements] = useState([]);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("token");

  // 🔐 Vérification utilisateur
  useEffect(() => {
    if (!token) return;

    fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(() => logout());
  }, []);

  // 📥 Charger bénéficiaires
  const loadBeneficiaires = async () => {
    const res = await fetch(`${API}/beneficiaires`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setBeneficiaires(data);
  };

  // 📥 Charger accompagnement
  const loadAccompagnement = async (id) => {
    const res = await fetch(`${API}/accompagnement/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setAccompagnements(data);
  };

  useEffect(() => {
    if (token) loadBeneficiaires();
  }, [token]);

  // 🔔 Toast
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 🚪 Logout
  const logout = () => {
    localStorage.removeItem("token");
    location.reload();
  };

  // 📄 Export PDF
  const exportPDF = () => {
    if (!selected) return;

    const doc = new jsPDF();
    doc.addImage(logo, "PNG", 10, 10, 40, 20);

    doc.setFontSize(18);
    doc.text("Fiche Bénéficiaire", 10, 40);

    doc.setFontSize(12);
    doc.text(`Nom : ${selected.nom}`, 10, 60);
    doc.text(`Age : ${selected.age}`, 10, 70);
    doc.text(`Ville : ${selected.ville}`, 10, 80);
    doc.text(`Profil : ${selected.profil}`, 10, 90);

    doc.save("fiche.pdf");
  };

  // ➕ Ajouter accompagnement
  const addAccompagnement = async () => {
    const res = await fetch(`${API}/accompagnement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        beneficiaire_id: selected.id,
        type: "Entretien",
        contenu: "Nouvelle note",
      }),
    });

    if (res.ok) {
      showToast("Accompagnement ajouté");
      loadAccompagnement(selected.id);
    }
  };

  if (!user) return <div style={{ padding: 50 }}>Chargement...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b1220", color: "white" }}>
      
      {/* SIDEBAR */}
      <div style={{ width: 260, background: "#020617", padding: 20 }}>
        <img src={logo} style={{ width: 60, borderRadius: 10 }} />
        <h2>Suivi Solidaire</h2>
        <p style={{ color: "#94a3b8" }}>{user.email}</p>

        <MenuButton label="Dashboard" onClick={() => setView("dashboard")} />
        <MenuButton label="Bénéficiaires" onClick={() => setView("benef")} />
        <MenuButton label="Accompagnement" onClick={() => setView("accompagnement")} />
        <MenuButton label="Documents" onClick={() => setView("docs")} />
        
        <button onClick={logout} style={{ marginTop: 20, background: "#7f1d1d", padding: 10 }}>
          Déconnexion
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: 20 }}>
        
        <h1>Plateforme de suivi</h1>

        {/* BENEFICIAIRES */}
        {view === "benef" && (
          <div>
            <h2>Bénéficiaires</h2>
            {beneficiaires.map(b => (
              <div key={b.id}
                onClick={() => {
                  setSelected(b);
                  loadAccompagnement(b.id);
                }}
                style={{ padding: 10, border: "1px solid #333", marginBottom: 10, cursor: "pointer" }}
              >
                {b.nom} - {b.ville}
              </div>
            ))}

            {selected && (
              <div>
                <h3>Détail</h3>
                <button onClick={exportPDF}>Exporter PDF</button>
              </div>
            )}
          </div>
        )}

        {/* ACCOMPAGNEMENT */}
        {view === "accompagnement" && selected && (
          <div>
            <h2>Accompagnement - {selected.nom}</h2>

            <button onClick={addAccompagnement}>Ajouter</button>

            {accompagnements.map(a => (
              <div key={a.id} style={{ marginTop: 10 }}>
                <b>{a.type}</b>
                <p>{a.contenu}</p>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* TOAST */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: toast.type === "error" ? "#7f1d1d" : "#065f46",
          padding: 15,
          borderRadius: 10
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function MenuButton({ label, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: 10,
        marginTop: 10,
        background: "#1e293b",
        cursor: "pointer",
        borderRadius: 8
      }}
    >
      {label}
    </div>
  );
}