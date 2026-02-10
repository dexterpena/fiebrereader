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
  return (
    <div className="chapter-list">
      <h2>Chapters ({chapters.length})</h2>
      <ul>
        {chapters.map((ch, i) => (
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
    </div>
  );
}
