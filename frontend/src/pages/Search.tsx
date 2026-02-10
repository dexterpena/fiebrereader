import { useState } from "react";
import { api } from "../lib/api";
import MangaCard from "../components/MangaCard";

interface Manga {
  url: string;
  title: string;
  thumbnail: string;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await api<{ mangas: Manga[] }>(
        `/api/manga/search?q=${encodeURIComponent(query)}`
      );
      setResults(data.mangas);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page">
      <h1>Search Manga</h1>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="search-input"
        />
        <button type="submit" disabled={loading} className="btn">
          {loading ? "Searching..." : "Search"}
        </button>
      </form>
      {searched && results.length === 0 && (
        <p className="no-results">No results found.</p>
      )}
      <div className="manga-grid">
        {results.map((m, i) => (
          <MangaCard key={i} {...m} />
        ))}
      </div>
    </div>
  );
}
