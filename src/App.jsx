import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import logo from "./assets/logo.png";

const API = import.meta.env.VITE_API_URL;

export default function App() {
  const [view, setView] = useState("dashboard");
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [entretiens, setEntretiens] = useState([]);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem("token");

  // 🔔 Toast
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // 📥 Charger bénéficiaires
  const loadBeneficiaires = async () => {
    try {
      const res = await fetch(`${API}/beneficiaires`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBeneficiaires(data);
    } catch {
      showToast("Erreur chargement bénéficiaires");
    }
  };

  // 📥 Charger entretiens
  const loadEntretiens = async (id) => {
    try {
      const res = await fetch(`${API}/entretiens/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntretiens(data);
    } catch {
      showToast("Erreur chargement entretiens");
    }
  };

  useEffect(() => {
    if (token) loadBeneficiaires();
  }, []);

  // 📄 PDF
  const exportPDF = () => {
    if (!selected) return;

    const doc = new jsPDF();

    doc.addImage(logo, "PNG", 10, 10, 40, 20);
    doc.setFontSize(16);
    doc.text("Fiche bénéficiaire", 10, 40);

    doc.text(`Nom : ${selected.nom}`, 10, 60);
    doc.text(`Ville : ${selected.ville}`, 10, 70);
    doc.text(`Profil : ${selected.profil}`, 10, 80);

    doc.save("fiche.pdf");
  };

  // ➕ Ajouter entretien
  const addEntretien = async () => {
    const res = await fetch(`${API}/entretiens`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        beneficiaire_id: selected.id,
        contenu: "Nouvel entretien",
      }),
    });

    if (res.ok) {
      showToast("Entretien ajouté");
      loadEntretiens(selected.id);
    }
  };

  // 🚪 Logout
  const logout = () => {
    localStorage.removeItem("token");
    location.reload();
  };

  // 🔐 Si pas de token
  if (!token) {
    return (
      <div style={{ padding: 50 }}>
        <h2>Veuillez vous connecter</h2>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0b1220", color: "white" }}>
      
      {/* MENU */}
      <div style={{ width: 250, background: "#020617", padding: 20 }}>
        <img src={logo} style={{ width: 60 }} />
        <h2>Suivi Solidaire</h2>

        <Menu label="Dashboard" onClick={() => setView("dashboard")} />
        <Menu label="Bénéficiaires" onClick={() => setView("benef")} />
        <Menu label="Accompagnement" onClick={() => setView("accompagnement")} />

        <button onClick={logout} style={{ marginTop: 20 }}>
          Déconnexion
        </button>
      </div>

      {/* CONTENU */}
      <div style={{ flex: 1, padding: 20 }}>

        {view === "dashboard" && <h1>Dashboard</h1>}

        {/* BENEF */}
        {view === "benef" && (
          <div>
            <h2>Bénéficiaires</h2>

            {beneficiaires.map((b) => (
              <div key={b.id}
                onClick={() => {
                  setSelected(b);
                  loadEntretiens(b.id);
                }}
                style={{ border: "1px solid #333", margin: 5, padding: 10, cursor: "pointer" }}
              >
                {b.nom} - {b.ville}
              </div>
            ))}

            {selected && (
              <div>
                <h3>{selected.nom}</h3>
                <button onClick={exportPDF}>PDF</button>
              </div>
            )}
          </div>
        )}

        {/* ACCOMPAGNEMENT */}
        {view === "accompagnement" && selected && (
          <div>
            <h2>Entretiens - {selected.nom}</h2>

            <button onClick={addEntretien}>Ajouter entretien</button>

            {entretiens.map((e) => (
              <div key={e.id} style={{ marginTop: 10 }}>
                {e.contenu}
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
          background: "#065f46",
          padding: 10
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

function Menu({ label, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: 10, cursor: "pointer" }}>
      {label}
    </div>
  );
}