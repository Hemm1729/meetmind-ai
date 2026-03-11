from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
from supabase import create_client, Client

router = APIRouter()

def get_supabase() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    print(f"DEBUG: SUPABASE_URL={url}")
    print(f"DEBUG: SUPABASE_SERVICE_KEY={key[:10] + '...' if key else None}")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    return create_client(url, key)


class EmailRequest(BaseModel):
    email: EmailStr


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    token: str


@router.post("/send-otp")
async def send_otp(req: EmailRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.sign_in_with_otp({
            "email": req.email,
            "options": {
                "should_create_user": True,
                "data": {}
            }
        })
        return {"message": "OTP sent to your email"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify-otp")
async def verify_otp(req: OTPVerifyRequest):
    """Verify OTP token and return session tokens"""
    supabase = get_supabase()
    try:
        res = supabase.auth.verify_otp({
            "email": req.email,
            "token": req.token,
            "type": "email"
        })
        if res.user:
            return {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
                "user": {
                    "id": res.user.id,
                    "email": res.user.email
                }
            }
        raise HTTPException(status_code=401, detail="Invalid OTP")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/refresh")
async def refresh_token(payload: dict):
    """Refresh access token using refresh token"""
    supabase = get_supabase()
    try:
        res = supabase.auth.refresh_session(payload.get("refresh_token"))
        return {
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))