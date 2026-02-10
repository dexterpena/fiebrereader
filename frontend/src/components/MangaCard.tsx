import { Link } from "react-router-dom";
import { imageProxyUrl } from "../lib/api";

interface Props {
  url: string;
  title: string;
  thumbnail: string;
}

export default function MangaCard({ url, title, thumbnail }: Props) {
  const detailPath = `/manga?url=${encodeURIComponent(url)}`;
  const imgSrc = thumbnail ? imageProxyUrl(thumbnail) : "/placeholder.svg";

  return (
    <Link to={detailPath} className="manga-card">
      <div className="manga-card-image">
        <img src={imgSrc} alt={title} loading="lazy" />
      </div>
      <div className="manga-card-title">{title}</div>
    </Link>
  );
}
