from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from app.services.auth import auth_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    username: str


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
