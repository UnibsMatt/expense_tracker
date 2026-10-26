import hmac
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import ADMIN_PASSWORD, ADMIN_USER, JWT_SECRET, JWT_TTL_HOURS

bearer = HTTPBearer(auto_error=False)


def check_credentials(username: str, password: str) -> bool:
    user_ok = hmac.compare_digest(username.encode(), ADMIN_USER.encode())
    pwd_ok = hmac.compare_digest(password.encode(), ADMIN_PASSWORD.encode())
    return user_ok and pwd_ok


def create_token(username: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS)
    return jwt.encode({"sub": username, "exp": exp}, JWT_SECRET, algorithm="HS256")


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")
    return payload["sub"]
