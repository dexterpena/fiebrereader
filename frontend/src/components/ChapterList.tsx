import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface Chapter {
  url: string;
  name: string;
  chapter_number: number;
  date: string | null;
}

interface ChapterStatusMap {
  [chapterUrl: string]: { is_read: boolean; is_bookmarked: boolean };
}

interface Props {
  chapters: Chapter[];
  mangaUrl: string;
}

export default function ChapterList({ chapters, mangaUrl }: Props) {
  const { user } = useAuth();
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");
  const [statuses, setStatuses] = useState<ChapterStatusMap>({});

  // Load chapter statuses if logged in
  useEffect(() => {
    if (!user || !mangaUrl) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await api<{ statuses: ChapterStatusMap }>(
          `/api/chapters/status?manga_url=${encodeURIComponent(mangaUrl)}`
        );
        if (!cancelled) setStatuses(data.statuses);
      } catch (err) {
        console.error("Failed to load chapter statuses:", err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user, mangaUrl]);

  const filtered = useMemo(() => {
    let list = chapters;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          String(ch.chapter_number).includes(q)
      );
    }
    return [...list].sort((a, b) =>
      sortDesc
        ? b.chapter_number - a.chapter_number
        : a.chapter_number - b.chapter_number
    );
  }, [chapters, sortDesc, filter]);

  const toggleRead = async (ch: Chapter) => {
    const current = statuses[ch.url]?.is_read || false;
    const newVal = !current;
    setStatuses((prev) => ({
      ...prev,
      [ch.url]: { ...prev[ch.url], is_read: newVal, is_bookmarked: prev[ch.url]?.is_bookmarked || false },
    }));
    await api("/api/chapters/mark-read", {
      method: "POST",
      body: JSON.stringify({ manga_url: mangaUrl, chapter_url: ch.url, chapter_number: ch.chapter_number, is_read: newVal }),
    }).catch((err) => console.error("Failed to save read status:", err));
  };

  const toggleBookmark = async (ch: Chapter) => {
    const current = statuses[ch.url]?.is_bookmarked || false;
    const newVal = !current;
    setStatuses((prev) => ({
      ...prev,
      [ch.url]: { ...prev[ch.url], is_bookmarked: newVal, is_read: prev[ch.url]?.is_read || false },
    }));
    await api("/api/chapters/bookmark", {
      method: "POST",
      body: JSON.stringify({ manga_url: mangaUrl, chapter_url: ch.url, is_bookmarked: newVal }),
    }).catch((err) => console.error("Failed to save bookmark:", err));
  };

  const togglePreviousRead = async (ch: Chapter) => {
    const urls = chapters
      .filter((c) => c.chapter_number < ch.chapter_number)
      .map((c) => c.url);
    if (urls.length === 0) return;
    // Check if all previous are already read
    const allRead = urls.every((url) => statuses[url]?.is_read);
    const newVal = !allRead;
    // Optimistic update
    setStatuses((prev) => {
      const next = { ...prev };
      for (const url of urls) {
        next[url] = { ...next[url], is_read: newVal, is_bookmarked: next[url]?.is_bookmarked || false };
      }
      return next;
    });
    // The max chapter number is the one just below the clicked chapter
    const prevChapters = chapters.filter((c) => c.chapter_number < ch.chapter_number);
    const maxChapterNum = prevChapters.length > 0
      ? Math.max(...prevChapters.map((c) => c.chapter_number))
      : 0;
    await api("/api/chapters/mark-previous-read", {
      method: "POST",
      body: JSON.stringify({ manga_url: mangaUrl, chapter_urls: urls, max_chapter_number: maxChapterNum, is_read: newVal }),
    }).catch((err) => console.error("Failed to mark previous:", err));
  };

  return (
    <div className="chapter-list">
      <div className="chapter-list-header">
        <h2>Chapters ({chapters.length})</h2>
        <div className="chapter-controls">
          <input
            type="text"
            className="chapter-filter"
            placeholder="Filter chapters..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            className="btn btn-sm"
            onClick={() => setSortDesc((p) => !p)}
            title={sortDesc ? "Sorted descending" : "Sorted ascending"}
          >
            <i className={`fa-solid ${sortDesc ? "fa-arrow-down-wide-short" : "fa-arrow-up-wide-short"}`} />
            {sortDesc ? " Newest" : " Oldest"}
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="no-results">No chapters match your filter.</p>
      ) : (
        <ul>
          {filtered.map((ch, i) => {
            const isRead = statuses[ch.url]?.is_read || false;
            const isBookmarked = statuses[ch.url]?.is_bookmarked || false;
            return (
              <li key={i} className={`chapter-item${isRead ? " is-read" : ""}`}>
                <div className="chapter-item-row">
                  <Link
                    to={`/read?url=${encodeURIComponent(ch.url)}&manga=${encodeURIComponent(mangaUrl)}`}
                    className="chapter-item-link"
                  >
                    <span className="chapter-name">{ch.name}</span>
                    {ch.date && (
                      <span className="chapter-date">
                        {new Date(ch.date).toLocaleDateString()}
                      </span>
                    )}
                  </Link>
                  {user && (
                    <div className="chapter-actions">
                      <button
                        className={`btn-icon${isRead ? " active" : ""}`}
                        onClick={() => toggleRead(ch)}
                        title={isRead ? "Mark as unread" : "Mark as read"}
                      >
                        <i className={`fa-solid ${isRead ? "fa-circle-check" : "fa-circle"}`} />
                      </button>
                      <button
                        className={`btn-icon${isBookmarked ? " active" : ""}`}
                        onClick={() => toggleBookmark(ch)}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                      >
                        <i className={`fa-solid ${isBookmarked ? "fa-bookmark" : "fa-bookmark"}`} style={isBookmarked ? undefined : { opacity: 0.5 }} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => togglePreviousRead(ch)}
                        title="Toggle all previous as read"
                      >
                        <i className="fa-solid fa-backward" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
