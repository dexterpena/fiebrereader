"""
LeerCapitulo scraper — ported from the Kotlin/Tachiyomi extension.
Uses BeautifulSoup + httpx to parse manga, chapters, and images.
"""

import re
import json
from datetime import datetime, timedelta
from urllib.parse import quote, urljoin

import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://www.leercapitulo.co"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,"
              "image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
}

IMAGE_HEADERS = {
    **HEADERS,
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}

CHAPTER_NUMBER_RE = re.compile(
    r"(?:Cap[ií]tulo|Cap\.?|Chapter|Ch\.?)\s*(\d+(?:\.\d+)?)", re.IGNORECASE
)


TITLE_SUFFIXES = [
    " - Read Manga Online leercapitulo.co",
    " - Leer Manga Online leercapitulo.co",
    " - leercapitulo.co",
]


def _clean_title(title: str) -> str:
    """Remove site suffixes from a title string."""
    for suffix in TITLE_SUFFIXES:
        if title.endswith(suffix):
            title = title[: -len(suffix)]
    return title.strip()


def _abs_url(url: str) -> str:
    """Ensure a URL is absolute."""
    if not url:
        return ""
    return url if url.startswith("http") else urljoin(BASE_URL, url)


def _get_img_src(img_tag) -> str:
    """Extract image source from an img tag, handling lazy-load attributes."""
    if not img_tag:
        return ""
    src = img_tag.get("data-src") or img_tag.get("data-lazy") or img_tag.get("src") or ""
    return _abs_url(src.strip())


def _parse_relative_date(date_str: str) -> datetime | None:
    """Parse Spanish relative dates like 'hace 2 horas'."""
    if "hace" not in date_str.lower():
        return None

    digits = re.findall(r"\d+", date_str)
    number = int(digits[0]) if digits else 0
    now = datetime.now()

    lower = date_str.lower()
    if "hora" in lower:
        return now - timedelta(hours=number)
    if "día" in lower or "dia" in lower:
        return now - timedelta(days=number)
    if "semana" in lower:
        return now - timedelta(weeks=number)
    if "mes" in lower:
        return now - timedelta(days=number * 30)
    return None


def _parse_date(date_str: str) -> str | None:
    """Parse a date string and return ISO format, or None."""
    if not date_str:
        return None

    # Try relative date first
    dt = _parse_relative_date(date_str.strip())
    if dt:
        return dt.isoformat()

    # Try dd/MM/yyyy
    try:
        dt = datetime.strptime(date_str.strip(), "%d/%m/%Y")
        return dt.isoformat()
    except ValueError:
        return None


async def _fetch(url: str) -> BeautifulSoup:
    """Fetch a URL and return a BeautifulSoup document."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")


def _parse_manga_list(soup: BeautifulSoup) -> list[dict]:
    """Parse a list of manga from a page (popular, latest, search)."""
    mangas = []
    seen_urls = set()

    for link in soup.select('a[href*="/manga/"]'):
        href = link.get("href", "")
        if "/leer/" in href or not link.get_text(strip=True):
            continue
        if href in seen_urls:
            continue
        seen_urls.add(href)

        # Look for thumbnail: try inside the link, parent, grandparent, and
        # preceding sibling <a> (covers are often in a separate image link)
        thumbnail = ""
        img_tag = link.find("img")
        if not img_tag:
            parent = link.parent
            if parent:
                img_tag = parent.find("img")
            if not img_tag and parent and parent.parent:
                img_tag = parent.parent.find("img")
            # Also check preceding sibling <a> tags that might wrap an image
            if not img_tag and parent:
                for sib in parent.find_all("a"):
                    img_tag = sib.find("img")
                    if img_tag:
                        break
        if img_tag:
            thumbnail = _get_img_src(img_tag)

        mangas.append({
            "url": href,
            "title": _clean_title(link.get_text(strip=True)),
            "thumbnail": thumbnail,
        })

    return mangas


async def get_popular(page: int = 1) -> dict:
    """Fetch popular (ongoing) manga."""
    soup = await _fetch(f"{BASE_URL}/status/ongoing/?page={page}")
    mangas = _parse_manga_list(soup)

    current_page = page
    has_next = soup.select_one(
        f"a[href*='page={current_page + 1}'], a.next, a[rel='next']"
    ) is not None

    return {"mangas": mangas, "page": current_page, "has_next": has_next}


async def get_latest(page: int = 1) -> dict:
    """Fetch latest updated manga."""
    url = BASE_URL if page == 1 else f"{BASE_URL}/?page={page}"
    soup = await _fetch(url)
    mangas = _parse_manga_list(soup)

    has_next = soup.select_one("a[href*='page=2'], a.next") is not None and page == 1

    return {"mangas": mangas, "page": page, "has_next": has_next}


async def search_manga(query: str, page: int = 1) -> dict:
    """Search for manga using the site's autocomplete JSON endpoint."""
    async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(
            f"{BASE_URL}/search-autocomplete",
            params={"term": query},
        )
        resp.raise_for_status()
        results = resp.json()

    mangas = []
    for item in results:
        link = item.get("link", "")
        thumbnail = item.get("thumbnail", "")
        mangas.append({
            "url": link,
            "title": _clean_title(item.get("label", item.get("value", ""))),
            "thumbnail": _abs_url(thumbnail) if thumbnail else "",
        })

    return {"mangas": mangas, "page": page, "has_next": False}


async def get_manga_detail(manga_url: str) -> dict:
    """Fetch full manga details from a manga page URL.

    The site stores manga metadata inside ``p.description-update`` within
    ``div.media-body``.  The HTML looks like::

        <p class="description-update">
          <span>Títulos Alternativos: </span>alt1, alt2<br/>
          <span>Géneros: </span><a>G1</a>, <a>G2</a><br/>
          <span>Escribe: Manga</span><br/>
          <span>Estado: </span>Ongoing<br/>
        </p>

    We parse each ``<span>`` label to extract the structured fields.
    """
    url = _abs_url(manga_url)
    soup = await _fetch(url)

    # --- Title ---
    title_el = soup.select_one("h1.title-manga, h1, meta[property='og:title']")
    title = ""
    if title_el:
        title = _clean_title(title_el.get_text(strip=True) or title_el.get("content", ""))

    # --- Cover ---
    cover = ""
    for sel in [
        'meta[property="og:image"]',
        'img[src*="/covers/"]',
        'img[src*="/uploads/"]',
        ".cover img",
        ".manga-cover img",
        ".thumb img",
        ".poster img",
        "article img",
        ".entry-content img",
    ]:
        cover_el = soup.select_one(sel)
        if cover_el:
            cover = cover_el.get("content") or cover_el.get("data-src") or cover_el.get("src") or ""
            cover = _abs_url(cover.strip())
            if cover:
                break

    # --- Parse p.description-update for structured metadata ---
    alt_titles = ""
    genres: list[str] = []
    manga_type = ""
    status = "unknown"
    author = None
    artist = None

    info_block = soup.select_one("p.description-update")
    if info_block:
        # Extract genre links specifically from this block (not the sidebar)
        genre_links = info_block.select('a[href*="/genre/"]')
        genres = [a.get_text(strip=True) for a in genre_links if a.get_text(strip=True)]

        # Walk through <span> labels to find structured fields
        for span in info_block.select("span"):
            label = span.get_text(strip=True).lower()

            if "alternativos" in label or "alternative" in label:
                # Text after span until <br>
                val_parts = []
                for sib in span.next_siblings:
                    if getattr(sib, "name", None) == "br":
                        break
                    text = sib.get_text(strip=True) if hasattr(sib, "get_text") else str(sib).strip()
                    if text:
                        val_parts.append(text)
                alt_titles = " ".join(val_parts).strip().strip(",").strip()

            elif "género" in label or "genero" in label or "genres" in label:
                # Genres are already captured via links above
                pass

            elif "escribe" in label or "tipo" in label or "type" in label:
                # May be inline: "Escribe: Manga"
                text = span.get_text(strip=True)
                # Extract value after colon
                if ":" in text:
                    manga_type = text.split(":", 1)[1].strip()
                else:
                    # Value in next sibling
                    nxt = span.next_sibling
                    if nxt:
                        manga_type = (nxt.get_text(strip=True) if hasattr(nxt, "get_text") else str(nxt).strip())

            elif "estado" in label or "status" in label:
                # Value in next sibling text
                val_parts = []
                for sib in span.next_siblings:
                    if getattr(sib, "name", None) == "br":
                        break
                    text = sib.get_text(strip=True) if hasattr(sib, "get_text") else str(sib).strip()
                    if text:
                        val_parts.append(text)
                status_text = " ".join(val_parts).strip().lower()
                if any(s in status_text for s in ("ongoing", "publicándose", "en curso")):
                    status = "Ongoing"
                elif any(s in status_text for s in ("completed", "finalizado", "completado")):
                    status = "Completed"
                elif status_text:
                    status = status_text.capitalize()

            elif "autor" in label or "author" in label:
                val_parts = []
                for sib in span.next_siblings:
                    if getattr(sib, "name", None) == "br":
                        break
                    text = sib.get_text(strip=True) if hasattr(sib, "get_text") else str(sib).strip()
                    if text:
                        val_parts.append(text)
                author = " ".join(val_parts).strip() or None

            elif "artista" in label or "artist" in label:
                val_parts = []
                for sib in span.next_siblings:
                    if getattr(sib, "name", None) == "br":
                        break
                    text = sib.get_text(strip=True) if hasattr(sib, "get_text") else str(sib).strip()
                    if text:
                        val_parts.append(text)
                artist = " ".join(val_parts).strip() or None

    # --- Synopsis: text under "Sinopsis" heading ---
    description = None
    sinopsis_h = soup.find(["h2", "h3"], string=lambda t: "sinopsis" in t.lower() if t else False)
    if sinopsis_h:
        nxt = sinopsis_h.find_next(["p", "div"])
        if nxt:
            description = nxt.get_text(strip=True)
    if not description:
        for p in soup.select("p"):
            text = p.get_text(strip=True)
            if len(text) > 100 and "alternativos" not in text.lower():
                description = text
                break

    return {
        "url": manga_url,
        "title": title,
        "cover": cover,
        "author": author,
        "artist": artist,
        "description": description,
        "genres": genres,
        "status": status,
        "alt_titles": alt_titles,
        "manga_type": manga_type,
    }


async def get_chapters(manga_url: str) -> list[dict]:
    """Fetch the chapter list for a manga."""
    url = _abs_url(manga_url)
    soup = await _fetch(url)

    elements = soup.select('h4 > a[href*="/leer/"]')
    if not elements:
        elements = [
            a for a in soup.select('a[href*="/leer/"]')
            if re.search(r"(?:capitulo|cap)", a.get_text(), re.IGNORECASE)
        ]

    chapters = []
    for el in elements:
        href = el.get("href", "")
        raw_name = el.get_text(strip=True) or el.get("title", "")

        # Chapter number
        match = CHAPTER_NUMBER_RE.search(raw_name)
        chapter_number = float(match.group(1)) if match else -1

        # Date
        parent = el.parent
        date_el = parent.select_one(".date, .fecha, time, span.time") if parent else None
        date = _parse_date(date_el.get_text(strip=True)) if date_el else None

        chapters.append({
            "url": href,
            "name": raw_name.strip(),
            "chapter_number": chapter_number,
            "date": date,
        })

    chapters.reverse()
    return chapters


async def get_chapter_images(chapter_url: str) -> list[str]:
    """
    Fetch chapter page images using a headless browser (Playwright).
    The site renders a <select> dropdown where each <option> contains the
    image URL as its value and the page number as text (e.g. "1/15").
    We extract all image URLs from these option values.
    """
    from playwright.async_api import async_playwright

    url = _abs_url(chapter_url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            user_agent=HEADERS["User-Agent"],
            extra_http_headers={"Referer": BASE_URL},
        )

        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)

        # Extract image URLs from the page selector <select> options
        # The site has select dropdowns where options with image URLs as values
        # contain page numbers like "1/15", "2/15", etc.
        image_urls = await page.evaluate("""
            () => {
                const urls = [];
                const selects = document.querySelectorAll('select');
                for (const sel of selects) {
                    for (const opt of sel.options) {
                        const val = opt.value.trim();
                        if (val.match(/\\.(jpg|jpeg|png|webp|gif)/i) && val.startsWith('http')) {
                            if (!urls.includes(val)) urls.push(val);
                        }
                    }
                }
                return urls;
            }
        """)

        # Fallback: also collect any manga images loaded on the page
        if not image_urls:
            image_urls = await page.evaluate("""
                () => {
                    const urls = [];
                    const imgs = document.querySelectorAll('img');
                    for (const img of imgs) {
                        const src = img.dataset.src || img.dataset.original || img.src || '';
                        if (src.match(/\\.(jpg|jpeg|png|webp|gif)/i) && !src.includes('/assets/')) {
                            if (!urls.includes(src)) urls.push(src);
                        }
                    }
                    return urls;
                }
            """)

        await browser.close()

    return image_urls


def _is_image_url(url: str) -> bool:
    lower = url.lower()
    return any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"))


async def fetch_image_bytes(image_url: str) -> bytes:
    """Download a single image and return its bytes."""
    async with httpx.AsyncClient(headers=IMAGE_HEADERS, follow_redirects=True, timeout=30) as client:
        resp = await client.get(image_url)
        resp.raise_for_status()
        return resp.content
