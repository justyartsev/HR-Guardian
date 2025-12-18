from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os
load_dotenv()
class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM")

    class Config:
        env_file = ".env"

settings = Settings()
