import io
import img2pdf
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app import scraper

router = APIRouter(prefix="/api/reader", tags=["reader"])


@router.get("/image-proxy")
async def image_proxy(url: str = Query(...)):
    """Proxy a manga image to avoid CORS issues in the frontend."""
    image_bytes = await scraper.fetch_image_bytes(url)

    # Detect content type from URL
    lower = url.lower()
    if ".png" in lower:
        media_type = "image/png"
    elif ".webp" in lower:
        media_type = "image/webp"
    elif ".gif" in lower:
        media_type = "image/gif"
    else:
        media_type = "image/jpeg"

    return StreamingResponse(io.BytesIO(image_bytes), media_type=media_type)


@router.get("/download-pdf")
async def download_pdf(url: str = Query(..., description="Chapter URL")):
    """Download a chapter as a PDF file."""
    image_urls = await scraper.get_chapter_images(url)
    if not image_urls:
        return {"error": "No images found for this chapter"}

    # Download all images
    image_data = []
    for img_url in image_urls:
        try:
            data = await scraper.fetch_image_bytes(img_url)
            if data:
                image_data.append(data)
        except Exception:
            continue

    if not image_data:
        return {"error": "Failed to download chapter images"}

    # Convert to PDF
    pdf_bytes = img2pdf.convert(image_data)

    # Extract a filename from the URL
    parts = url.rstrip("/").split("/")
    filename = f"chapter-{parts[-1]}.pdf" if parts else "chapter.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
