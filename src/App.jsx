import { useEffect, useState } from "react";
import "./App.css";

const API = "https://suivi-solidaire-backend.onrender.com";

export default function App() {
  const [page, setPage] = useState("ateliers");

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    };
  }

  function showToast(msg) {
    alert(msg);
  }

  return (
    <div className="app">
      <aside>
        <button onClick={() => setPage("ateliers")}>Ateliers</button>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAteliers();
  }, []);

  function formatDate(date) {
    if (!date) return "";
    return String(date).slice(0, 10);
  }

  async function loadAteliers() {
    try {
      setLoading(true);

      const res = await fetch(`${API}/ateliers`);

      if (!res.ok) {
        throw new Error("Erreur API ateliers");
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      setAteliers(list);

      if (!selectedAtelier && list.length > 0) {
        setSelectedAtelier(list[0]);
      }
    } catch (error) {
      console.error("Erreur loadAteliers:", error);
      showToast("Impossible de charger les ateliers");
    } finally {
      setLoading(false);
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
      <section>
        <h2>Ateliers</h2>

        {loading ? (
          <p>Chargement...</p>
        ) : ateliers.length === 0 ? (
          <p>Aucun atelier trouvé</p>
        ) : (
          ateliers.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelectedAtelier(a)}
              className="atelier-card"
            >
              <strong>{a.titre}</strong>
              <div>{formatDate(a.date)}</div>
              <div>{a.lieu}</div>
            </div>
          ))
        )}
      </section>

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
              placeholder="Titre"
            />

            <input
              type="date"
              value={formatDate(selectedAtelier.date)}
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
              placeholder="Lieu"
            />

            <input
              value={selectedAtelier.intervenant || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  intervenant: e.target.value,
                })
              }
              placeholder="Intervenant"
            />

            <textarea
              value={selectedAtelier.description || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  description: e.target.value,
                })
              }
              placeholder="Description"
            />

            <h3>Participants</h3>

            {selectedAtelier.atelier_participants?.length ? (
              selectedAtelier.atelier_participants.map((p) => (
                <div key={p.id} className="participant">
                  {p.beneficiaires?.nom || "Participant"}
                </div>
              ))
            ) : (
              <p>Aucun participant</p>
            )}

            <input
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              placeholder="ID bénéficiaire"
            />

            <button onClick={addParticipant}>
              Ajouter le participant
            </button>

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