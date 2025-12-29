import os
import uuid
import aiofiles
import logging
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

class FileHandler:
    """Handles file upload, storage, and cleanup operations"""

    @staticmethod
    async def save_upload(file: UploadFile) -> tuple[str, str]:
        """
        Save an uploaded file and return its mesh_id and file path

        Args:
            file: The uploaded file

        Returns:
            Tuple of (mesh_id, file_path)

        Raises:
            HTTPException: If file validation or save fails
        """
        try:
            # Validate file type
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Invalid file type. Must be an image.")

            # Read file content
            content = await file.read()

            # Validate file size
            size_mb = len(content) / (1024 * 1024)
            if size_mb > settings.MAX_UPLOAD_SIZE_MB:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB"
                )

            # Generate unique mesh ID
            mesh_id = str(uuid.uuid4())

            # Determine file extension
            ext = "png"
            if file.content_type:
                if "jpeg" in file.content_type or "jpg" in file.content_type:
                    ext = "jpg"
                elif "png" in file.content_type:
                    ext = "png"

            # Save file
            file_path = os.path.join(settings.UPLOADS_DIR, f"{mesh_id}.{ext}")

            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)

            logger.info(f"Saved upload {mesh_id} to {file_path} ({size_mb:.2f}MB)")

            return mesh_id, file_path

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving upload: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    @staticmethod
    def get_output_path(mesh_id: str, extension: str = "glb") -> str:
        """
        Get the output file path for a given mesh ID

        Args:
            mesh_id: The unique mesh identifier
            extension: File extension (default: glb)

        Returns:
            Full path to the output file
        """
        return os.path.join(settings.OUTPUTS_DIR, f"{mesh_id}.{extension}")

    @staticmethod
    def file_exists(file_path: str) -> bool:
        """Check if a file exists"""
        return os.path.exists(file_path) and os.path.isfile(file_path)

    @staticmethod
    async def read_file(file_path: str) -> bytes:
        """
        Read a file and return its contents

        Args:
            file_path: Path to the file

        Returns:
            File contents as bytes

        Raises:
            FileNotFoundError: If file doesn't exist
        """
        if not FileHandler.file_exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        async with aiofiles.open(file_path, 'rb') as f:
            return await f.read()

    @staticmethod
    async def cleanup_old_files():
        """
        Remove files older than CLEANUP_AFTER_HOURS

        This should be run as a background task
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=settings.CLEANUP_AFTER_HOURS)

            # Cleanup uploads
            await FileHandler._cleanup_directory(settings.UPLOADS_DIR, cutoff_time)

            # Cleanup outputs
            await FileHandler._cleanup_directory(settings.OUTPUTS_DIR, cutoff_time)

            logger.info("File cleanup completed")

        except Exception as e:
            logger.error(f"Error during file cleanup: {str(e)}")

    @staticmethod
    async def _cleanup_directory(directory: str, cutoff_time: datetime):
        """Clean up files in a directory older than cutoff_time"""
        if not os.path.exists(directory):
            return

        for filename in os.listdir(directory):
            file_path = os.path.join(directory, filename)

            if not os.path.isfile(file_path):
                continue

            # Get file modification time
            file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))

            if file_mtime < cutoff_time:
                try:
                    os.remove(file_path)
                    logger.info(f"Removed old file: {file_path}")
                except Exception as e:
                    logger.error(f"Failed to remove {file_path}: {str(e)}")
