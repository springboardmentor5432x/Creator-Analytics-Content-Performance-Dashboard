import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./creatoriq_dev.db")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
SEED_DEMO_USERS = os.getenv("SEED_DEMO_USERS", "true").lower() == "true"
BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))  # tests lower this for speed
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
