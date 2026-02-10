import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, imageProxyUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ChapterList from "../components/ChapterList";

interface MangaInfo {
  url: string;
  title: string;
  cover: string;
  author: string | null;
  artist: string | null;
  description: string | null;
  genres: string[];
  status: string;
}

interface Chapter {
  url: string;
  name: string;
  chapter_number: number;
  date: string | null;
}

export default function MangaDetail() {
  const [params] = useSearchParams();
  const mangaUrl = params.get("url") || "";
  const { user } = useAuth();

  const [manga, setManga] = useState<MangaInfo | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [inLibrary, setInLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coverError, setCoverError] = useState(false);

  useEffect(() => {
    if (!mangaUrl) return;
    Promise.all([
      api<MangaInfo>(`/api/manga/detail?url=${encodeURIComponent(mangaUrl)}`),
      api<Chapter[]>(`/api/manga/chapters?url=${encodeURIComponent(mangaUrl)}`),
    ])
      .then(([detail, chaps]) => {
        setManga(detail);
        setChapters(chaps);
      })
      .finally(() => setLoading(false));
  }, [mangaUrl]);

  useEffect(() => {
    if (!user) return;
    api<{ entries: { manga_url: string }[] }>("/api/library").then((data) => {
      setInLibrary(data.entries.some((e) => e.manga_url === mangaUrl));
    });
  }, [user, mangaUrl]);

  const toggleLibrary = async () => {
    if (!manga) return;
    if (inLibrary) {
      const data = await api<{ entries: { id: string; manga_url: string }[] }>(
        "/api/library"
      );
      const entry = data.entries.find((e) => e.manga_url === mangaUrl);
      if (entry) {
        await api(`/api/library/${entry.id}`, { method: "DELETE" });
        setInLibrary(false);
      }
    } else {
      await api("/api/library", {
        method: "POST",
        body: JSON.stringify({
          manga_url: mangaUrl,
          manga_title: manga.title,
          cover_url: manga.cover,
        }),
      });
      setInLibrary(true);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!manga) return <div className="error">Manga not found.</div>;

  return (
    <div className="manga-detail">
      <div className="manga-detail-header">
        {manga.cover && !coverError ? (
          <img
            src={imageProxyUrl(manga.cover)}
            alt={manga.title}
            className="manga-detail-cover"
            onError={() => setCoverError(true)}
          />
        ) : (
          <div className="manga-detail-cover manga-cover-placeholder">
            {manga.title.charAt(0)}
          </div>
        )}
        <div className="manga-detail-info">
          <h1>{manga.title}</h1>
          {manga.author && <p><strong>Author:</strong> {manga.author}</p>}
          {manga.artist && <p><strong>Artist:</strong> {manga.artist}</p>}
          <p><strong>Status:</strong> {manga.status}</p>
          {manga.genres.length > 0 && (
            <div className="genres">
              {manga.genres.map((g, i) => (
                <span key={i} className="genre-tag">{g}</span>
              ))}
            </div>
          )}
          {manga.description && <p className="description">{manga.description}</p>}
          {user && (
            <button onClick={toggleLibrary} className="btn">
              {inLibrary ? "Remove from Library" : "Add to Library"}
            </button>
          )}
        </div>
      </div>
      <ChapterList chapters={chapters} mangaUrl={mangaUrl} />
    </div>
  );
}
