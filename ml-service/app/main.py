import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import ConvertResponse, StatusResponse, HealthResponse
from app.services.file_handler import FileHandler
from app.services.sketch2mesh_service import Sketch2MeshService
from app.utils.setup import initialize_models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state for tracking conversions
# In production, use Redis or a database
conversion_status: Dict[str, dict] = {}

# Global state for initialization
models_ready = False
sketch2mesh_available = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global models_ready, sketch2mesh_available

    # Startup
    logger.info("Starting ML service...")

    # Initialize models and sketch2mesh repository
    init_success = await initialize_models()

    if init_success:
        models_ready = True
        sketch2mesh_available = True
        logger.info("ML service initialization completed successfully")
    else:
        logger.error("ML service initialization failed")
        models_ready = False
        sketch2mesh_available = False

    # Start background cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup())

    yield

    # Shutdown
    logger.info("Shutting down ML service...")
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="Sketch2Mesh ML Service",
    description="Convert 2D sketches to 3D meshes using sketch2mesh",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Next.js domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def periodic_cleanup():
    """Periodic background task for file cleanup"""
    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            await FileHandler.cleanup_old_files()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in periodic cleanup: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if models_ready else "initializing",
        models_ready=models_ready,
        sketch2mesh_available=sketch2mesh_available
    )


@app.post("/convert", response_model=ConvertResponse)
async def convert_sketch(
    sketch: UploadFile = File(...),
    model_type: str = Form(...),
    sketch_style: str = Form("suggestive")
):
    """
    Convert a 2D sketch to a 3D mesh

    Args:
        sketch: The sketch image file (PNG/JPG)
        model_type: Type of model ("cars" or "chairs")
        sketch_style: Style of sketch ("suggestive", "fd", "handdrawn")

    Returns:
        ConvertResponse with mesh_id and status
    """
    try:
        # Validate service is ready
        if not models_ready:
            raise HTTPException(status_code=503, detail="Service not ready. Models are still initializing.")

        # Validate model type
        if model_type not in ["cars", "chairs"]:
            raise HTTPException(status_code=400, detail="model_type must be 'cars' or 'chairs'")

        # Validate sketch style
        if sketch_style not in ["suggestive", "fd", "handdrawn"]:
            raise HTTPException(status_code=400, detail="sketch_style must be 'suggestive', 'fd', or 'handdrawn'")

        # Save uploaded file
        mesh_id, sketch_path = await FileHandler.save_upload(sketch)

        # Initialize status tracking
        conversion_status[mesh_id] = {
            "status": "processing",
            "progress": 0,
            "error": None
        }

        # Get output path
        output_path = FileHandler.get_output_path(mesh_id, "glb")

        # Start async conversion (run in background)
        asyncio.create_task(
            process_conversion(mesh_id, sketch_path, model_type, sketch_style, output_path)
        )

        logger.info(f"Started conversion {mesh_id} for {model_type} model")

        return ConvertResponse(
            mesh_id=mesh_id,
            status="processing",
            download_url=None
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in convert endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")


async def process_conversion(
    mesh_id: str,
    sketch_path: str,
    model_type: str,
    sketch_style: str,
    output_path: str
):
    """Background task to process the conversion"""
    try:
        logger.info(f"Processing conversion {mesh_id}")

        # Update progress
        conversion_status[mesh_id]["progress"] = 10

        # Run sketch2mesh conversion
        service = Sketch2MeshService()
        conversion_status[mesh_id]["progress"] = 30

        success = await service.convert_sketch_to_mesh(
            sketch_path=sketch_path,
            model_type=model_type,
            sketch_style=sketch_style,
            output_path=output_path
        )

        if success:
            conversion_status[mesh_id]["status"] = "completed"
            conversion_status[mesh_id]["progress"] = 100
            logger.info(f"Conversion {mesh_id} completed successfully")
        else:
            conversion_status[mesh_id]["status"] = "failed"
            conversion_status[mesh_id]["error"] = "Conversion process failed"
            logger.error(f"Conversion {mesh_id} failed")

    except Exception as e:
        logger.error(f"Error processing conversion {mesh_id}: {str(e)}")
        conversion_status[mesh_id]["status"] = "failed"
        conversion_status[mesh_id]["error"] = str(e)


@app.get("/convert/{mesh_id}/status", response_model=StatusResponse)
async def get_conversion_status(mesh_id: str):
    """
    Get the status of a conversion

    Args:
        mesh_id: The unique mesh identifier

    Returns:
        StatusResponse with current status and progress
    """
    if mesh_id not in conversion_status:
        raise HTTPException(status_code=404, detail="Mesh ID not found")

    status_data = conversion_status[mesh_id]

    return StatusResponse(
        status=status_data["status"],
        progress=status_data.get("progress"),
        error=status_data.get("error")
    )


@app.get("/convert/{mesh_id}/download")
async def download_mesh(mesh_id: str):
    """
    Download the converted mesh file

    Args:
        mesh_id: The unique mesh identifier

    Returns:
        FileResponse with the GLB file
    """
    # Check if conversion exists
    if mesh_id not in conversion_status:
        raise HTTPException(status_code=404, detail="Mesh ID not found")

    # Check if conversion is complete
    if conversion_status[mesh_id]["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Conversion not completed. Status: {conversion_status[mesh_id]['status']}"
        )

    # Get file path
    file_path = FileHandler.get_output_path(mesh_id, "glb")

    # Check if file exists
    if not FileHandler.file_exists(file_path):
        raise HTTPException(status_code=404, detail="Mesh file not found")

    # Return file
    return FileResponse(
        path=file_path,
        media_type="model/gltf-binary",
        filename=f"{mesh_id}.glb",
        headers={
            "Content-Disposition": f"attachment; filename={mesh_id}.glb"
        }
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Sketch2Mesh ML Service",
        "status": "healthy" if models_ready else "initializing",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
