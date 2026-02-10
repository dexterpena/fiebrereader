import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface AnilistStatus {
  linked: boolean;
  anilist_user_id?: number;
  anilist_username?: string;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const [anilistStatus, setAnilistStatus] = useState<AnilistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Handle Anilist OAuth callback
  useEffect(() => {
    const code = params.get("code");
    const isCallback = params.get("anilist_callback");
    if (code && isCallback && user) {
      api("/api/anilist/exchange-code", {
        method: "POST",
        body: JSON.stringify({ code }),
      })
        .then(() => loadAnilistStatus())
        .catch((err) => alert(`Anilist link failed: ${err.message}`));
    }
  }, [params, user]);

  const loadAnilistStatus = async () => {
    try {
      const data = await api<AnilistStatus>("/api/anilist/status");
      setAnilistStatus(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAnilistStatus();
  }, [user]);

  if (authLoading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  const linkAnilist = async () => {
    const data = await api<{ url: string }>("/api/anilist/auth-url");
    window.location.href = data.url;
  };

  const unlinkAnilist = async () => {
    await api("/api/anilist/unlink", { method: "DELETE" });
    setAnilistStatus({ linked: false });
  };

  const syncFromAnilist = async () => {
    setSyncing(true);
    try {
      const data = await api<{ entries: unknown[] }>("/api/anilist/manga-list");
      alert(`Fetched ${data.entries.length} entries from Anilist.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <section className="settings-section">
        <h2>Account</h2>
        <p>Logged in as: {user.email}</p>
      </section>
      <section className="settings-section">
        <h2>Anilist Integration</h2>
        {anilistStatus?.linked ? (
          <div>
            <p>
              Connected as: <strong>{anilistStatus.anilist_username}</strong>
            </p>
            <p>
              Reading progress is automatically synced to Anilist when you finish
              a chapter.
            </p>
            <div className="settings-buttons">
              <button onClick={syncFromAnilist} className="btn" disabled={syncing}>
                {syncing ? "Syncing..." : "Import from Anilist"}
              </button>
              <button onClick={unlinkAnilist} className="btn btn-danger">
                Unlink Anilist
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>
              Link your Anilist account to sync your reading progress
              automatically.
            </p>
            <button onClick={linkAnilist} className="btn">
              Connect Anilist
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
