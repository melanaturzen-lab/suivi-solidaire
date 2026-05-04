import { useEffect, useState } from "react";
import "./App.css";

const API = "https://suivi-solidaire-backend.onrender.com";

export default function App() {
  const [page, setPage] = useState("ateliers");

  function headers() {
    return {
      "Content-Type": "application/json",
    };
  }

  function showToast(msg) {
    alert(msg);
  }

  return (
    <div className="app">
      <aside>
        <button onClick={() => setPage("dashboard")}>
          Tableau de bord
        </button>
        <button onClick={() => setPage("beneficiaires")}>
          Bénéficiaires
        </button>
        <button onClick={() => setPage("accompagnement")}>
          Accompagnement
        </button>
        <button onClick={() => setPage("documents")}>
          Documents
        </button>
        <button onClick={() => setPage("ateliers")}>
          Ateliers
        </button>
      </aside>

      <main>
        {page === "ateliers" && (
          <Ateliers headers={headers} showToast={showToast} />
        )}
      </main>
    </div>
  );
}

function Ateliers({ headers, showToast }) {
  const [ateliers, setAteliers] = useState([]);
  const [selectedAtelier, setSelectedAtelier] = useState(null);
  const [participantId, setParticipantId] = useState("");

  useEffect(() => {
    loadAteliers();
  }, []);

  async function loadAteliers() {
    try {
      const res = await fetch(`${API}/ateliers`);
      const data = await res.json();

      setAteliers(data || []);

      if (data.length > 0 && !selectedAtelier) {
        setSelectedAtelier(data[0]); // 👉 sélection automatique
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur chargement ateliers");
    }
  }

  async function updateAtelier() {
    if (!selectedAtelier) return;

    const res = await fetch(`${API}/api/ateliers/${selectedAtelier.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(selectedAtelier),
    });

    if (!res.ok) {
      showToast("Erreur modification");
      return;
    }

    showToast("Atelier modifié");
    loadAteliers();
  }

  async function deleteAtelier(id) {
    if (!confirm("Supprimer cet atelier ?")) return;

    const res = await fetch(`${API}/api/ateliers/${id}`, {
      method: "DELETE",
      headers: headers(),
    });

    if (!res.ok) {
      showToast("Erreur suppression");
      return;
    }

    setSelectedAtelier(null);
    showToast("Atelier supprimé");
    loadAteliers();
  }

  async function addParticipant() {
    if (!selectedAtelier || !participantId) return;

    const res = await fetch(
      `${API}/api/ateliers/${selectedAtelier.id}/participants`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ beneficiaire_id: participantId }),
      }
    );

    if (!res.ok) {
      showToast("Erreur ajout participant");
      return;
    }

    showToast("Participant ajouté");
    setParticipantId("");
    loadAteliers();
  }

  return (
    <div className="detail-grid">
      {/* LISTE */}
      <section>
        <h2>Ateliers</h2>

        {ateliers.map((a) => (
          <div
            key={a.id}
            className="atelier-card"
            onClick={() => setSelectedAtelier(a)}
          >
            <strong>{a.titre}</strong>
            <div>{a.date}</div>
            <div>{a.lieu}</div>
          </div>
        ))}
      </section>

      {/* DETAIL */}
      <section>
        {!selectedAtelier ? (
          <p>Clique sur un atelier</p>
        ) : (
          <div className="detail-atelier">
            <h2>Détail atelier</h2>

            <input
              value={selectedAtelier.titre || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  titre: e.target.value,
                })
              }
            />

            <input
              type="date"
              value={selectedAtelier.date?.slice(0, 10) || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  date: e.target.value,
                })
              }
            />

            <input
              value={selectedAtelier.lieu || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  lieu: e.target.value,
                })
              }
            />

            <input
              value={selectedAtelier.intervenant || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  intervenant: e.target.value,
                })
              }
            />

            <textarea
              value={selectedAtelier.description || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  description: e.target.value,
                })
              }
            />

            <h3>Participants</h3>

            {selectedAtelier.atelier_participants?.map((p) => (
              <div key={p.id} className="participant">
                {p.beneficiaires?.nom || "Participant"}
              </div>
            ))}

            <input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="ID bénéficiaire"
            />

            <button onClick={addParticipant}>
              Ajouter le participant
            </button>

            {/* 🔥 BOUTONS CORRIGÉS */}
            <button onClick={updateAtelier}>
              Modifier l’atelier
            </button>

            <button
              className="delete"
              onClick={() => deleteAtelier(selectedAtelier.id)}
            >
              Supprimer l’atelier
            </button>
          </div>
        )}
      </section>
    </div>
  );
}