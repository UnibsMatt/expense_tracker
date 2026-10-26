import os
import secrets

ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
# Set JWT_SECRET in .env so sessions survive restarts.
JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_urlsafe(48)
JWT_TTL_HOURS = int(os.getenv("JWT_TTL_HOURS", "720"))  # 30 days
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////data/expenses.db")
