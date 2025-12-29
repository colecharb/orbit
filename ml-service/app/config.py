import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Get the base directory (ml-service/)
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Sketch2Mesh repository
    SKETCH2MESH_REPO_URL: str = "https://github.com/cvlab-epfl/sketch2mesh.git"
    SKETCH2MESH_DIR: str = str(BASE_DIR / "sketch2mesh")

    # Data directories
    MODELS_DIR: str = str(BASE_DIR / "data" / "models")
    UPLOADS_DIR: str = str(BASE_DIR / "data" / "uploads")
    OUTPUTS_DIR: str = str(BASE_DIR / "data" / "outputs")

    # Google Drive model IDs
    CARS_MODEL_GDRIVE_ID: str = "1C09_0RMiG2on8rvEqo3z79GzDoGvI3I2"
    CHAIRS_MODEL_GDRIVE_ID: str = "1MEf4p-MaSVzL9v3i1GTMzJogM_0ciz6y"

    # File constraints
    MAX_UPLOAD_SIZE_MB: int = 10
    CLEANUP_AFTER_HOURS: int = 24

    # Conversion settings
    DEFAULT_SKETCH_STYLE: str = "suggestive"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
