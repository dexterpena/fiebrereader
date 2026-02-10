import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api, pdfDownloadUrl } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import ReaderViewer from "../components/ReaderViewer";

export default function Reader() {
  const [params] = useSearchParams();
  const chapterUrl = params.get("url") || "";
  const mangaUrl = params.get("manga") || "";
  const { user } = useAuth();

  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chapterUrl) return;
    api<{ images: string[] }>(
      `/api/manga/chapter-images?url=${encodeURIComponent(chapterUrl)}`
    )
      .then((data) => setImages(data.images))
      .finally(() => setLoading(false));
  }, [chapterUrl]);

  const updateProgress = async (page: number) => {
    if (!user || !mangaUrl) return;
    // Update library progress when the user reads pages
    // Extract chapter number from URL
    const parts = chapterUrl.split("/").filter(Boolean);
    const chapNum = parseFloat(parts[parts.length - 1]) || 0;
    if (chapNum > 0 && page === images.length - 1) {
      try {
        const libData = await api<{
          entries: { id: string; manga_url: string; current_chapter: number; anilist_media_id: number | null }[];
        }>("/api/library");
        const entry = libData.entries.find((e) => e.manga_url === mangaUrl);
        if (entry && chapNum > entry.current_chapter) {
          await api(`/api/library/${entry.id}`, {
            method: "PATCH",
            body: JSON.stringify({ current_chapter: chapNum }),
          });
          // Sync with Anilist if linked
          if (entry.anilist_media_id) {
            await api("/api/anilist/sync", {
              method: "POST",
              body: JSON.stringify({
                anilist_media_id: entry.anilist_media_id,
                chapter: Math.floor(chapNum),
                status: "reading",
              }),
            }).catch(() => {}); // Don't fail if Anilist sync fails
          }
        }
      } catch {
        // Library update is best-effort
      }
    }
  };

  if (loading) return <div className="loading">Loading chapter...</div>;

  return (
    <div className="reader-page">
      <div className="reader-header">
        {mangaUrl && (
          <Link to={`/manga?url=${encodeURIComponent(mangaUrl)}`} className="btn btn-sm">
            Back to Manga
          </Link>
        )}
        <a
          href={pdfDownloadUrl(chapterUrl)}
          className="btn btn-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download PDF
        </a>
      </div>
      <ReaderViewer images={images} onPageChange={updateProgress} />
    </div>
  );
}
