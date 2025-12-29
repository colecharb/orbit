import { useState, useCallback, useEffect, useRef } from 'react';
import { convertSketchToMesh, getMeshStatus, downloadMesh, ModelType } from '@/lib/api/ml-service';
import { exportCanvasAsBlob } from '@/lib/canvas-utils';

type ConversionStatus = 'idle' | 'converting' | 'completed' | 'error';

interface UseMeshConversionResult {
  status: ConversionStatus;
  progress: number;
  meshUrl: string | null;
  error: string | null;
  convertSketch: (canvas: HTMLCanvasElement, modelType: ModelType) => Promise<void>;
  reset: () => void;
}

export function useMeshConversion(): UseMeshConversionResult {
  const [status, setStatus] = useState<ConversionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [meshUrl, setMeshUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const meshIdRef = useRef<string | null>(null);

  const convertSketch = useCallback(async (canvas: HTMLCanvasElement, modelType: ModelType) => {
    try {
      setStatus('converting');
      setProgress(0);
      setError(null);

      // Export canvas as blob
      const blob = await exportCanvasAsBlob(canvas);

      // Start conversion
      const response = await convertSketchToMesh({
        sketch: blob,
        modelType,
        sketchStyle: 'suggestive',
      });

      meshIdRef.current = response.mesh_id;
      setProgress(10);

      // Start polling for status
      pollIntervalRef.current = setInterval(async () => {
        try {
          if (!meshIdRef.current) return;

          const statusData = await getMeshStatus(meshIdRef.current);

          // Update progress
          if (statusData.progress !== undefined) {
            setProgress(statusData.progress);
          }

          // Check if completed
          if (statusData.status === 'completed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Download the mesh
            const meshBlob = await downloadMesh(meshIdRef.current);
            const url = URL.createObjectURL(meshBlob);

            setMeshUrl(url);
            setStatus('completed');
            setProgress(100);

          } else if (statusData.status === 'failed') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            setStatus('error');
            setError(statusData.error || 'Conversion failed');
          }

        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 2000); // Poll every 2 seconds

    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Conversion failed');

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);

    // Clean up object URL
    if (meshUrl) {
      URL.revokeObjectURL(meshUrl);
      setMeshUrl(null);
    }

    // Clear polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    meshIdRef.current = null;
  }, [meshUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (meshUrl) {
        URL.revokeObjectURL(meshUrl);
      }
    };
  }, [meshUrl]);

  return {
    status,
    progress,
    meshUrl,
    error,
    convertSketch,
    reset,
  };
}
