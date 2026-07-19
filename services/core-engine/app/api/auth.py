from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.services.auth import auth_service
from app.api.deps import get_current_user
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    username: str


@router.get("/token", response_model=TokenResponse)
async def single_user_token():
    """Single-user mode: return the static token so the UI can authenticate
    without a login screen. Intentionally unauthenticated — in a personal
    (single-user) deployment, being able to reach the API IS the access
    control. Returns 404 when single-user mode is disabled or unconfigured."""
    if not settings.single_user_mode or not settings.single_user_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return TokenResponse(access_token=settings.single_user_token)


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    if not auth_service.authenticate_user(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_service.create_access_token(request.username)
    return TokenResponse(access_token=token)


@router.post("/logout")
async def logout(current_user: str = Depends(get_current_user)):
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: str = Depends(get_current_user)):
    return UserResponse(username=current_user)
