import os
import subprocess
import logging
from pathlib import Path

from app.config import settings
from app.services.demo_mesh_generator import DemoMeshGenerator

logger = logging.getLogger(__name__)

# DEMO MODE: Using simple mesh generator since pretrained models aren't available
USE_DEMO_MODE = True

class Sketch2MeshService:
    """Service for running sketch2mesh model inference (currently in DEMO mode)"""

    @staticmethod
    async def convert_sketch_to_mesh(
        sketch_path: str,
        model_type: str,
        sketch_style: str,
        output_path: str
    ) -> bool:
        """
        Convert a 2D sketch to a 3D mesh

        Args:
            sketch_path: Path to the input sketch image
            model_type: Type of model ("cars" or "chairs")
            sketch_style: Style of sketch ("suggestive", "fd", "handdrawn")
            output_path: Path to save the output GLB file

        Returns:
            bool: True if conversion successful, False otherwise
        """
        try:
            # Validate inputs
            if not os.path.exists(sketch_path):
                logger.error(f"Sketch file not found: {sketch_path}")
                return False

            if USE_DEMO_MODE:
                # Use demo generator
                logger.info(f"DEMO MODE: Generating simple {model_type} mesh from sketch")
                return await DemoMeshGenerator.generate_mesh_from_sketch(
                    sketch_path=sketch_path,
                    model_type=model_type,
                    output_path=output_path
                )
            else:
                # Original sketch2mesh code (disabled until models are available)
                logger.info(f"Starting sketch2mesh conversion: {model_type}, {sketch_style}")
                return await Sketch2MeshService._run_real_sketch2mesh(
                    sketch_path, model_type, sketch_style, output_path
                )

        except Exception as e:
            logger.error(f"Error during conversion: {str(e)}")
            return False

    @staticmethod
    async def _run_real_sketch2mesh(
        sketch_path: str,
        model_type: str,
        sketch_style: str,
        output_path: str
    ) -> bool:
        """Original sketch2mesh implementation (requires pretrained models)"""
        # This code is preserved for when models become available
        logger.error("Real sketch2mesh mode is disabled - pretrained models not available")
        return False

    @staticmethod
    async def _run_reconstruction(
        sketch_path: str,
        model_path: str,
        model_type: str,
        sketch_style: str,
        output_dir: str
    ) -> bool:
        """Run the sketch2mesh reconstruction script"""
        try:
            # Path to the reconstruction script
            reconstruct_script = os.path.join(
                settings.SKETCH2MESH_DIR,
                "reconstruct_sketch2mesh.py"
            )

            if not os.path.exists(reconstruct_script):
                logger.error(f"Reconstruction script not found: {reconstruct_script}")
                return False

            # Build command
            # Note: The exact command structure may need to be adjusted based on
            # the actual sketch2mesh API. This is a placeholder.
            cmd = [
                "python",
                reconstruct_script,
                "--sketch", sketch_path,
                "--model", model_path,
                "--category", model_type,
                "--style", sketch_style,
                "--output", output_dir
            ]

            logger.info(f"Running command: {' '.join(cmd)}")

            # Run the subprocess
            result = subprocess.run(
                cmd,
                cwd=settings.SKETCH2MESH_DIR,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )

            if result.returncode != 0:
                logger.error(f"Reconstruction failed with code {result.returncode}")
                logger.error(f"STDOUT: {result.stdout}")
                logger.error(f"STDERR: {result.stderr}")
                return False

            logger.info("Reconstruction completed successfully")
            logger.debug(f"STDOUT: {result.stdout}")

            return True

        except subprocess.TimeoutExpired:
            logger.error("Reconstruction timed out after 5 minutes")
            return False
        except Exception as e:
            logger.error(f"Error running reconstruction: {str(e)}")
            return False

    @staticmethod
    def _find_obj_file(directory: str) -> str:
        """Find the first OBJ file in a directory"""
        try:
            for file in os.listdir(directory):
                if file.lower().endswith('.obj'):
                    return os.path.join(directory, file)
            return ""
        except Exception as e:
            logger.error(f"Error finding OBJ file: {str(e)}")
            return ""

    @staticmethod
    def _cleanup_intermediate_files(directory: str):
        """Clean up intermediate files and directories"""
        try:
            import shutil
            if os.path.exists(directory):
                shutil.rmtree(directory)
                logger.info(f"Cleaned up intermediate files: {directory}")
        except Exception as e:
            logger.warning(f"Failed to clean up {directory}: {str(e)}")
