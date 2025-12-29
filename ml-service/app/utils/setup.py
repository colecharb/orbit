import os
import subprocess
import logging
from pathlib import Path
import gdown

from app.config import settings

logger = logging.getLogger(__name__)

async def initialize_models() -> bool:
    """
    Initialize the ML service by:
    1. Creating necessary directories
    2. (DEMO MODE: Skipping model downloads - using simple mesh generator)

    Returns:
        bool: True if initialization successful, False otherwise
    """
    try:
        # Create necessary directories
        os.makedirs(settings.MODELS_DIR, exist_ok=True)
        os.makedirs(settings.UPLOADS_DIR, exist_ok=True)
        os.makedirs(settings.OUTPUTS_DIR, exist_ok=True)

        logger.info("DEMO MODE: Using simple mesh generator (pretrained models not available)")
        logger.info("ML service initialization completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error during initialization: {str(e)}")
        return False


async def clone_sketch2mesh_repo() -> bool:
    """Clone the sketch2mesh repository if it doesn't exist"""
    try:
        sketch2mesh_path = Path(settings.SKETCH2MESH_DIR)

        if sketch2mesh_path.exists():
            logger.info(f"Sketch2mesh repository already exists at {settings.SKETCH2MESH_DIR}")
            return True

        logger.info(f"Cloning sketch2mesh repository to {settings.SKETCH2MESH_DIR}")

        # Clone the repository
        result = subprocess.run(
            ["git", "clone", settings.SKETCH2MESH_REPO_URL, settings.SKETCH2MESH_DIR],
            capture_output=True,
            text=True,
            check=True
        )

        logger.info("Sketch2mesh repository cloned successfully")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"Git clone failed: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Error cloning repository: {str(e)}")
        return False


async def download_models() -> bool:
    """Download pre-trained models from Google Drive"""
    try:
        import zipfile

        models = {
            "cars": settings.CARS_MODEL_GDRIVE_ID,
            "chairs": settings.CHAIRS_MODEL_GDRIVE_ID,
        }

        for model_name, gdrive_id in models.items():
            # Check if model directory already exists
            model_dir = os.path.join(settings.MODELS_DIR, model_name)
            if os.path.exists(model_dir):
                logger.info(f"Model {model_name} already exists")
                continue

            logger.info(f"Downloading {model_name}.zip from Google Drive...")

            # Download zip file
            zip_path = os.path.join(settings.MODELS_DIR, f"{model_name}.zip")

            try:
                # Use URL format instead of just ID
                url = f"https://drive.google.com/uc?id={gdrive_id}"
                gdown.download(url, zip_path, quiet=False, fuzzy=True)

                if not os.path.exists(zip_path):
                    logger.error(f"Failed to download {model_name}.zip")
                    return False

                logger.info(f"Extracting {model_name}.zip...")

                # Extract zip file
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(settings.MODELS_DIR)

                # Remove zip file
                os.remove(zip_path)

                logger.info(f"Successfully set up {model_name} model")

            except Exception as e:
                logger.error(f"Failed to download/extract {model_name}: {str(e)}")
                # Clean up partial downloads
                if os.path.exists(zip_path):
                    os.remove(zip_path)
                return False

        return True

    except Exception as e:
        logger.error(f"Error downloading models: {str(e)}")
        return False


def verify_setup() -> bool:
    """Verify that all required components are in place (DEMO MODE)"""
    try:
        # Check directories exist
        if not os.path.exists(settings.MODELS_DIR):
            logger.error(f"Models directory not found at {settings.MODELS_DIR}")
            return False

        if not os.path.exists(settings.UPLOADS_DIR):
            logger.error(f"Uploads directory not found at {settings.UPLOADS_DIR}")
            return False

        if not os.path.exists(settings.OUTPUTS_DIR):
            logger.error(f"Outputs directory not found at {settings.OUTPUTS_DIR}")
            return False

        logger.info("Setup verification passed (DEMO MODE)")
        return True

    except Exception as e:
        logger.error(f"Error during verification: {str(e)}")
        return False


def get_model_path(model_type: str) -> str:
    """Get the path to a specific model directory"""
    if model_type not in ["cars", "chairs"]:
        raise ValueError(f"Unknown model type: {model_type}")

    model_dir = os.path.join(settings.MODELS_DIR, model_type)

    if not os.path.exists(model_dir):
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    return model_dir
