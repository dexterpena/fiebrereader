from fastapi import APIRouter, Query
from app import scraper

router = APIRouter(prefix="/api/manga", tags=["manga"])


@router.get("/popular")
async def popular(page: int = Query(1, ge=1)):
    return await scraper.get_popular(page)


@router.get("/latest")
async def latest(page: int = Query(1, ge=1)):
    return await scraper.get_latest(page)


@router.get("/search")
async def search(q: str = Query(..., min_length=1), page: int = Query(1, ge=1)):
    return await scraper.search_manga(q, page)


@router.get("/detail")
async def detail(url: str = Query(...)):
    return await scraper.get_manga_detail(url)


@router.get("/chapters")
async def chapters(url: str = Query(...)):
    return await scraper.get_chapters(url)


@router.get("/chapter-images")
async def chapter_images(url: str = Query(...)):
    images = await scraper.get_chapter_images(url)
    return {"images": images}
