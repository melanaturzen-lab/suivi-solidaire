import { useEffect, useState } from "react";
import jsPDF from "jspdf";

const API = "https://suivi-solidaire-backend.onrender.com";

export default function App() {
  const [beneficiaires, setBeneficiaires] = useState([]);
  const [selected, setSelected] = useState(null);
  const [actions, setActions] = useState([]);
  const [toast, setToast] = useState(null);

  const [form, setForm] = useState({
    nom: "",
    age: "",
    profil: "",
    ville: "",
    priorite: "",
    besoins: "",
    telephone: "",
    email: "",
    adresse: "",
    referent: "",
    notes: "",
  });

  const [actionForm, setActionForm] = useState({
    date: "",
    type: "",
    description: "",
  });

  // =========================
  // Toast
  // =========================
  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // =========================
  // Load bénéficiaires
  // =========================
  async function loadBeneficiaires() {
    try {
      const res = await fetch(`${API}/beneficiaires`);
      const data = await res.json();
      setBeneficiaires(data);
    } catch {
      showToast("Erreur chargement", "error");
    }
  }

  useEffect(() => {
    loadBeneficiaires();
  }, []);

  // =========================
  // Load actions
  // =========================
  async function loadActions(id) {
    const res = await fetch(`${API}/actions/${id}`);
    const data = await res.json();
    setActions(data);
  }

  // =========================
  // Ajouter bénéficiaire
  // =========================
  async function ajouter() {
    try {
      const res = await fetch(`${API}/beneficiaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      showToast("Bénéficiaire ajouté");
      setForm({});
      loadBeneficiaires();
    } catch {
      showToast("Erreur ajout", "error");
    }
  }

  // =========================
  // Supprimer
  // =========================
  async function supprimer(id) {
    if (!confirm("Supprimer ce bénéficiaire ?")) return;

    await fetch(`${API}/beneficiaires/${id}`, { method: "DELETE" });
    showToast("Supprimé");
    setSelected(null);
    loadBeneficiaires();
  }

  // =========================
  // Ajouter action
  // =========================
  async function ajouterAction() {
    try {
      await fetch(`${API}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...actionForm,
          beneficiaire_id: selected.id,
        }),
      });

      showToast("Action ajoutée");
      loadActions(selected.id);
    } catch {
      showToast("Erreur action", "error");
    }
  }

  // =========================
  // Export PDF
  // =========================
  function exporterPDF() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Fiche bénéficiaire", 20, 20);

    doc.setFontSize(12);
    doc.text(`Nom : ${selected.nom}`, 20, 40);
    doc.text(`Âge : ${selected.age}`, 20, 50);
    doc.text(`Profil : ${selected.profil}`, 20, 60);
    doc.text(`Ville : ${selected.ville}`, 20, 70);
    doc.text(`Adresse : ${selected.adresse || ""}`, 20, 80);
    doc.text(`Téléphone : ${selected.telephone || ""}`, 20, 90);
    doc.text(`Email : ${selected.email || ""}`, 20, 100);
    doc.text(`Référent : ${selected.referent || ""}`, 20, 110);
    doc.text(`Priorité : ${selected.priorite || ""}`, 20, 120);
    doc.text(`Besoins : ${selected.besoins || ""}`, 20, 130);

    doc.text("Notes :", 20, 145);
    doc.text(
      doc.splitTextToSize(selected.notes || "Aucune note", 170),
      20,
      155
    );

    let y = 180;

    doc.setFontSize(14);
    doc.text("Actions", 20, y);
    y += 10;

    doc.setFontSize(11);

    actions.forEach((a) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(`${a.date} - ${a.type}`, 20, y);
      y += 7;

      const lines = doc.splitTextToSize(a.description || "", 170);
      doc.text(lines, 20, y);
      y += lines.length * 7 + 5;
    });

    doc.save(`fiche-${selected.nom}.pdf`);
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: "#f0f2f5", padding: 20 }}>
        <h2>Suivi Solidaire</h2>

        {beneficiaires.map((b) => (
          <div
            key={b.id}
            style={{
              padding: 10,
              border: "1px solid #ccc",
              marginBottom: 10,
              cursor: "pointer",
            }}
            onClick={() => {
              setSelected(b);
              loadActions(b.id);
            }}
          >
            <strong>{b.nom}</strong>
            <div>{b.ville}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 20 }}>
        {/* Form ajout */}
        <h3>Ajouter un bénéficiaire</h3>

        {Object.keys(form).map((key) => (
          <input
            key={key}
            placeholder={key}
            value={form[key] || ""}
            onChange={(e) =>
              setForm({ ...form, [key]: e.target.value })
            }
            style={{ display: "block", marginBottom: 10 }}
          />
        ))}

        <button onClick={ajouter}>Ajouter</button>

        {/* Fiche */}
        {selected && (
          <>
            <hr />
            <h2>{selected.nom}</h2>

            <button onClick={exporterPDF}>
              Exporter en PDF
            </button>

            <button onClick={() => supprimer(selected.id)}>
              Supprimer
            </button>

            <h3>Actions</h3>

            {actions.map((a, i) => (
              <div key={i}>
                {a.date} - {a.type} : {a.description}
              </div>
            ))}

            <h4>Ajouter action</h4>

            <input
              placeholder="date"
              onChange={(e) =>
                setActionForm({ ...actionForm, date: e.target.value })
              }
            />
            <input
              placeholder="type"
              onChange={(e) =>
                setActionForm({ ...actionForm, type: e.target.value })
              }
            />
            <input
              placeholder="description"
              onChange={(e) =>
                setActionForm({
                  ...actionForm,
                  description: e.target.value,
                })
              }
            />

            <button onClick={ajouterAction}>
              Ajouter action
            </button>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            padding: 15,
            background: toast.type === "error" ? "#ff4d4f" : "#4caf50",
            color: "white",
            borderRadius: 5,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}