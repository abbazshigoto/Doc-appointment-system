from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import RegisterRequest
from app.modules.users.models import User


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AccountDeactivatedError(Exception):
    pass


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository

    async def register(self, data: RegisterRequest) -> User:
        existing = await self.repository.get_by_email(data.email)
        if existing is not None:
            raise EmailAlreadyRegisteredError(data.email)

        user = User(
            email=data.email,
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=data.role,
        )
        return await self.repository.create(user)

    async def authenticate(self, email: str, password: str) -> User:
        user = await self.repository.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError()
        if not user.is_active:
            raise AccountDeactivatedError()
        return user

    async def login(self, email: str, password: str) -> str:
        user = await self.authenticate(email, password)
        return create_access_token(subject=str(user.id), role=user.role.value)

    async def get_user_by_id(self, user_id: int) -> User | None:
        return await self.repository.get_by_id(user_id)
