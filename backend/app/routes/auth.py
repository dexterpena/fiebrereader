from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest):
    try:
        result = get_supabase().auth.sign_up({"email": req.email, "password": req.password})
        if result.user:
            return {"user": {"id": str(result.user.id), "email": result.user.email}}
        raise HTTPException(status_code=400, detail="Signup failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        result = get_supabase().auth.sign_in_with_password(
            {"email": req.email, "password": req.password}
        )
        if result.session:
            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "user": {"id": str(result.user.id), "email": result.user.email},
            }
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh(refresh_token: str):
    try:
        result = get_supabase().auth.refresh_session(refresh_token)
        if result.session:
            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
            }
        raise HTTPException(status_code=401, detail="Refresh failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
