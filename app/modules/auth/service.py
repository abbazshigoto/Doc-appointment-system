from app.modules.auth.repository import AuthRepository


class AuthService:
    def __init__(self, repository: AuthRepository):
        self.repository = repository
