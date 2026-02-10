from fastapi import Depends, HTTPException, Header
from app.supabase_client import get_supabase


async def get_current_user(authorization: str = Header(None)):
    """Extract and verify the Supabase JWT from the Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.removeprefix("Bearer ")
    try:
        user_response = get_supabase().auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user(authorization: str = Header(None)):
    """Like get_current_user but returns None instead of 401 for unauthenticated requests."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    try:
        user_response = get_supabase().auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user
    except Exception:
        pass
    return None
