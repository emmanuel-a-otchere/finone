from datetime import datetime, timedelta
from pathlib import Path
from jose import jwt, JWTError
from passlib.hash import bcrypt
from app.config import get_settings

settings = get_settings()


class AuthService:
    def __init__(self):
        self.htpasswd_path = Path(settings.htpasswd_file)
        self._ensure_htpasswd_exists()

    def _ensure_htpasswd_exists(self):
        if not self.htpasswd_path.exists():
            self.htpasswd_path.parent.mkdir(parents=True, exist_ok=True)
            self.htpasswd_path.touch()

    def _load_users(self) -> dict[str, str]:
        users = {}
        if self.htpasswd_path.exists():
            for line in self.htpasswd_path.read_text().strip().split("\n"):
                if line and ":" in line:
                    username, password_hash = line.split(":", 1)
                    users[username] = password_hash
        return users

    def _save_users(self, users: dict[str, str]):
        lines = [f"{username}:{password_hash}" for username, password_hash in users.items()]
        self.htpasswd_path.write_text("\n".join(lines))

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.verify(plain_password, hashed_password)

    def hash_password(self, password: str) -> str:
        return bcrypt.hash(password)

    def authenticate_user(self, username: str, password: str) -> bool:
        users = self._load_users()
        if username not in users:
            return False
        return self.verify_password(password, users[username])

    def create_access_token(self, username: str) -> str:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
        payload = {
            "sub": username,
            "exp": expire,
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    def verify_token(self, token: str) -> str | None:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            username: str = payload.get("sub")
            if username is None:
                return None
            return username
        except JWTError:
            return None

    def add_user(self, username: str, password: str) -> bool:
        users = self._load_users()
        if username in users:
            return False
        users[username] = self.hash_password(password)
        self._save_users(users)
        return True

    def remove_user(self, username: str) -> bool:
        users = self._load_users()
        if username not in users:
            return False
        del users[username]
        self._save_users(users)
        return True

    def list_users(self) -> list[str]:
        return list(self._load_users().keys())


auth_service = AuthService()
