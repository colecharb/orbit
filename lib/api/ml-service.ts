export type ModelType = 'cars' | 'chairs';
export type SketchStyle = 'suggestive' | 'fd' | 'handdrawn';

export interface ConvertOptions {
  sketch: Blob;
  modelType: ModelType;
  sketchStyle?: SketchStyle;
}

export interface ConvertResponse {
  mesh_id: string;
  status: 'processing' | 'completed' | 'failed';
  download_url?: string;
  error?: string;
}

export interface StatusResponse {
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}

export async function convertSketchToMesh(options: ConvertOptions): Promise<ConvertResponse> {
  const formData = new FormData();
  formData.append('sketch', options.sketch);
  formData.append('model_type', options.modelType);
  formData.append('sketch_style', options.sketchStyle || 'suggestive');

  const response = await fetch('/api/convert', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || 'Conversion failed');
  }

  return response.json();
}

export async function getMeshStatus(meshId: string): Promise<StatusResponse> {
  const response = await fetch(`/api/convert/${meshId}/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || 'Failed to get status');
  }

  return response.json();
}

export async function downloadMesh(meshId: string): Promise<Blob> {
  const response = await fetch(`/api/convert/${meshId}/download`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || 'Failed to download mesh');
  }

  return response.blob();
}
