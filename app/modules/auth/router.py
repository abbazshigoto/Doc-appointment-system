from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import RegisterRequest, TokenResponse, UserResponse
from app.modules.auth.service import AuthService, EmailAlreadyRegisteredError, InvalidCredentialsError

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(AuthRepository(db))


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, service: AuthService = Depends(get_auth_service)) -> UserResponse:
    try:
        user = await service.register(data)
    except EmailAlreadyRegisteredError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        token = await service.login(form_data.username, form_data.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def me(
    payload: dict = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    user = await service.get_user_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)
