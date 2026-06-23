from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "pvc_license_manager"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    ADMIN_EMAIL: str = "admin@pvccards.com"
    ADMIN_PASSWORD: str = "Admin@123"

    CORS_ORIGINS: str = "*"


settings = Settings()
