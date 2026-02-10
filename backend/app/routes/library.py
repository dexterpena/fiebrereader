from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/library", tags=["library"])


class AddToLibraryRequest(BaseModel):
    manga_url: str
    manga_title: str
    cover_url: str | None = None
    status: str = "reading"


class UpdateLibraryRequest(BaseModel):
    status: str | None = None
    current_chapter: float | None = None
    anilist_media_id: int | None = None


@router.get("")
async def get_library(user=Depends(get_current_user)):
    result = (
        get_supabase()
        .table("library")
        .select("*")
        .eq("user_id", str(user.id))
        .order("updated_at", desc=True)
        .execute()
    )
    return {"entries": result.data}


@router.post("")
async def add_to_library(req: AddToLibraryRequest, user=Depends(get_current_user)):
    try:
        result = (
            get_supabase()
            .table("library")
            .upsert(
                {
                    "user_id": str(user.id),
                    "manga_url": req.manga_url,
                    "manga_title": req.manga_title,
                    "cover_url": req.cover_url,
                    "status": req.status,
                },
                on_conflict="user_id,manga_url",
            )
            .execute()
        )
        return {"entry": result.data[0] if result.data else None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{entry_id}")
async def update_library_entry(
    entry_id: str, req: UpdateLibraryRequest, user=Depends(get_current_user)
):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = "now()"

    result = (
        get_supabase()
        .table("library")
        .update(updates)
        .eq("id", entry_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"entry": result.data[0]}


@router.delete("/{entry_id}")
async def remove_from_library(entry_id: str, user=Depends(get_current_user)):
    result = (
        get_supabase()
        .table("library")
        .delete()
        .eq("id", entry_id)
        .eq("user_id", str(user.id))
        .execute()
    )
    return {"deleted": bool(result.data)}
