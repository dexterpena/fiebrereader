import { useEffect, useState } from "react";
import { api } from "../lib/api";
import MangaCard from "../components/MangaCard";

interface Manga {
  url: string;
  title: string;
  thumbnail: string;
}

export default function Home() {
  const [popular, setPopular] = useState<Manga[]>([]);
  const [latest, setLatest] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<{ mangas: Manga[] }>("/api/manga/popular"),
      api<{ mangas: Manga[] }>("/api/manga/latest"),
    ])
      .then(([pop, lat]) => {
        setPopular(pop.mangas);
        setLatest(lat.mangas);
      })
      .catch((err) => console.error("Home fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="home">
      <section>
        <h2>Popular Manga</h2>
        <div className="manga-grid">
          {popular.map((m, i) => (
            <MangaCard key={i} {...m} />
          ))}
        </div>
      </section>
      <section>
        <h2>Latest Updates</h2>
        <div className="manga-grid">
          {latest.map((m, i) => (
            <MangaCard key={i} {...m} />
          ))}
        </div>
      </section>
    </div>
  );
}
