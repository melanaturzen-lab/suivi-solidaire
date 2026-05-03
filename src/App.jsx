import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API;

export default function App() {
  const [page, setPage] = useState("ateliers");

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  function showToast(msg) {
    alert(msg);
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <aside style={{ width: 200, background: "#111", padding: 10 }}>
        <button onClick={() => setPage("ateliers")}>Ateliers</button>
      </aside>

      <main style={{ flex: 1, padding: 20 }}>
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
    const res = await fetch(`${API}/ateliers`, { headers: headers() });
    const data = await res.json();
    setAteliers(data || []);
  }

  async function updateAtelier() {
    if (!selectedAtelier) return;

    const res = await fetch(`${API}/ateliers/${selectedAtelier.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(selectedAtelier),
    });

    if (!res.ok) return showToast("Erreur modification");

    showToast("Atelier modifié");
    loadAteliers();
  }

  async function deleteAtelier(id) {
    if (!confirm("Supprimer cet atelier ?")) return;

    const res = await fetch(`${API}/ateliers/${id}`, {
      method: "DELETE",
      headers: headers(),
    });

    if (!res.ok) return showToast("Erreur suppression");

    setSelectedAtelier(null);
    loadAteliers();
    showToast("Atelier supprimé");
  }

  async function addParticipant() {
    if (!selectedAtelier || !participantId) return;

    const res = await fetch(
      `${API}/ateliers/${selectedAtelier.id}/participants`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ beneficiaire_id: participantId }),
      }
    );

    if (!res.ok) return showToast("Erreur ajout participant");

    showToast("Participant ajouté");
    loadAteliers();
  }

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* LISTE */}
      <div style={{ width: "40%" }}>
        <h2>Ateliers</h2>

        {ateliers.map((a) => (
          <div
            key={a.id}
            onClick={() => setSelectedAtelier(a)}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 10,
              cursor: "pointer",
            }}
          >
            <strong>{a.titre}</strong>
            <div>{a.date}</div>
          </div>
        ))}
      </div>

      {/* DETAIL */}
      <div style={{ flex: 1 }}>
        {!selectedAtelier ? (
          <p>Clique sur un atelier</p>
        ) : (
          <div>
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
              value={selectedAtelier.date || ""}
              onChange={(e) =>
                setSelectedAtelier({
                  ...selectedAtelier,
                  date: e.target.value,
                })
              }
              placeholder="Date"
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
{selectedAtelier && (
  <>
            <h3>Participants</h3>

            {selectedAtelier.atelier_participants?.length ? (
              selectedAtelier.atelier_participants.map((p) => (
                <div key={p.id}>
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
{selectedAtelier && (
  <>
    <button
      onClick={updateAtelier}
      style={{
        display: "block",
        width: "100%",
        background: "green",
        color: "white",
        marginTop: 15,
        padding: 10,
      }}
    >
      Modifier l’atelier
    </button>

    <button
      onClick={() => deleteAtelier(selectedAtelier.id)}
      style={{
        display: "block",
        width: "100%",
        background: "red",
        color: "white",
        marginTop: 10,
        padding: 10,
      }}
    >
      Supprimer l’atelier
    </button>
  </>
)}
            {/* ✅ BOUTONS GARANTIS VISIBLES */}
            <button
              onClick={updateAtelier}
              style={{
                display: "block",
                width: "100%",
                background: "green",
                color: "white",
                marginTop: 15,
                padding: 10,
              }}
            >
              Modifier l’atelier
            </button>

            <button
              onClick={() => deleteAtelier(selectedAtelier.id)}
              style={{
                display: "block",
                width: "100%",
                background: "red",
                color: "white",
                marginTop: 10,
                padding: 10,
              }}
            >
              Supprimer l’atelier
            </button>

</div>

  </>
)}