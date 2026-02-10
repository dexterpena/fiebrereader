import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

interface Chapter {
  url: string;
  name: string;
  chapter_number: number;
  date: string | null;
}

interface Props {
  chapters: Chapter[];
  mangaUrl: string;
}

export default function ChapterList({ chapters, mangaUrl }: Props) {
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");

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
            {sortDesc ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="no-results">No chapters match your filter.</p>
      ) : (
        <ul>
          {filtered.map((ch, i) => (
            <li key={i} className="chapter-item">
              <Link
                to={`/read?url=${encodeURIComponent(ch.url)}&manga=${encodeURIComponent(mangaUrl)}`}
              >
                <span className="chapter-name">{ch.name}</span>
                {ch.date && (
                  <span className="chapter-date">
                    {new Date(ch.date).toLocaleDateString()}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
