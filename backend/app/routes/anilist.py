from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.supabase_client import get_supabase
from app import anilist

router = APIRouter(prefix="/api/anilist", tags=["anilist"])


@router.get("/auth-url")
async def get_auth_url(user=Depends(get_current_user)):
    """Return the Anilist OAuth URL to redirect the user to."""
    from app.config import settings as cfg

    if not cfg.anilist_client_id:
        raise HTTPException(
            status_code=400,
            detail="Anilist integration is not configured. Set ANILIST_CLIENT_ID and ANILIST_CLIENT_SECRET in backend .env",
        )
    return {"url": anilist.get_authorize_url()}


class ExchangeCodeRequest(BaseModel):
    code: str


@router.post("/exchange-code")
async def exchange_code(req: ExchangeCodeRequest, user=Depends(get_current_user)):
    """Exchange the OAuth code for an access token and store it."""
    try:
        token_data = await anilist.exchange_code(req.code)
        access_token = token_data["access_token"]

        # Get the Anilist user info
        viewer = await anilist.get_viewer(access_token)

        # Store in Supabase
        get_supabase().table("anilist_tokens").upsert(
            {
                "user_id": str(user.id),
                "access_token": access_token,
                "anilist_user_id": viewer["id"],
                "anilist_username": viewer["name"],
            },
            on_conflict="user_id",
        ).execute()

        return {
            "anilist_user": {
                "id": viewer["id"],
                "name": viewer["name"],
                "avatar": viewer.get("avatar", {}).get("large"),
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def anilist_status(user=Depends(get_current_user)):
    """Check if the user has linked their Anilist account."""
    result = (
        get_supabase()
        .table("anilist_tokens")
        .select("anilist_user_id, anilist_username")
        .eq("user_id", str(user.id))
        .execute()
    )
    if result.data:
        return {"linked": True, **result.data[0]}
    return {"linked": False}


@router.delete("/unlink")
async def unlink_anilist(user=Depends(get_current_user)):
    """Remove the Anilist connection."""
    get_supabase().table("anilist_tokens").delete().eq("user_id", str(user.id)).execute()
    return {"unlinked": True}


@router.get("/search")
async def search_anilist(
    title: str = Query(...), user=Depends(get_current_user)
):
    """Search Anilist for a manga to link."""
    token_row = _get_token(user)
    results = await anilist.search_manga(title, token_row["access_token"])
    return {"results": results}


class SyncProgressRequest(BaseModel):
    anilist_media_id: int
    chapter: int
    status: str = "reading"


@router.post("/sync")
async def sync_progress(req: SyncProgressRequest, user=Depends(get_current_user)):
    """Push reading progress to Anilist."""
    token_row = _get_token(user)
    result = await anilist.update_progress(
        req.anilist_media_id, req.chapter, req.status, token_row["access_token"]
    )
    return {"anilist_entry": result}


@router.get("/manga-list")
async def get_anilist_manga_list(user=Depends(get_current_user)):
    """Fetch the user's full Anilist manga list."""
    token_row = _get_token(user)
    entries = await anilist.get_user_manga_list(token_row["access_token"])
    return {"entries": entries}


def _get_token(user) -> dict:
    result = (
        get_supabase()
        .table("anilist_tokens")
        .select("access_token")
        .eq("user_id", str(user.id))
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=400, detail="Anilist account not linked")
    return result.data[0]
