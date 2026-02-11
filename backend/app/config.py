from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    anilist_client_id: str = ""
    anilist_client_secret: str = ""
    anilist_redirect_uri: str = "http://192.168.0.135:5173/settings?anilist_callback=true"
    backend_url: str = "http://192.168.0.135:8000"
    frontend_url: str = "http://192.168.0.135:5173"

    class Config:
        env_file = ".env"


settings = Settings()
