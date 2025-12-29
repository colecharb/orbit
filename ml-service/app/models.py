from pydantic import BaseModel
from typing import Optional, Literal

class ConvertRequest(BaseModel):
    model_type: Literal["cars", "chairs"]
    sketch_style: Literal["suggestive", "fd", "handdrawn"] = "suggestive"

class ConvertResponse(BaseModel):
    mesh_id: str
    status: Literal["processing", "completed", "failed"]
    download_url: Optional[str] = None
    error: Optional[str] = None

class StatusResponse(BaseModel):
    status: Literal["processing", "completed", "failed"]
    progress: Optional[int] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    models_ready: bool
    sketch2mesh_available: bool
