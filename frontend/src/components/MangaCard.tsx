import { useState } from "react";
import { Link } from "react-router-dom";
import { imageProxyUrl } from "../lib/api";

interface Props {
  url: string;
  title: string;
  thumbnail: string;
}

export default function MangaCard({ url, title, thumbnail }: Props) {
  const detailPath = `/manga?url=${encodeURIComponent(url)}`;
  const [imgError, setImgError] = useState(false);
  const imgSrc =
    thumbnail && !imgError ? imageProxyUrl(thumbnail) : "";

  return (
    <Link to={detailPath} className="manga-card">
      <div className="manga-card-image">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={title}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="manga-card-placeholder">{title.charAt(0)}</div>
        )}
      </div>
      <div className="manga-card-title">{title}</div>
    </Link>
  );
}
