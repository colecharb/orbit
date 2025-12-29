'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import { Suspense, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GRID_SIZE, BASE_CANVAS_SIZE } from '@/lib/constants';

interface SketchViewerProps {
  meshUrl: string;
  displaySize?: number;
}

function ContextMonitor() {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost, attempting to restore...');
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl]);

  return null;
}

function SketchModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // Extract edges from the mesh geometry
  const edgesGeometry = useMemo(() => {
    const edges: THREE.LineSegments[] = [];

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Create EdgesGeometry to extract only visible edges (15 degree threshold)
        const edgesGeom = new THREE.EdgesGeometry(child.geometry, 15);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 1
        });
        const edgesLine = new THREE.LineSegments(edgesGeom, edgesMaterial);

        // Apply the same transforms as the original mesh
        edgesLine.position.copy(child.position);
        edgesLine.rotation.copy(child.rotation);
        edgesLine.scale.copy(child.scale);

        edges.push(edgesLine);
      }
    });

    return edges;
  }, [scene]);

  // Cleanup geometries and materials on unmount
  useEffect(() => {
    return () => {
      edgesGeometry.forEach(edge => {
        if (edge.geometry) edge.geometry.dispose();
        if (edge.material) {
          if (Array.isArray(edge.material)) {
            edge.material.forEach(m => m.dispose());
          } else {
            edge.material.dispose();
          }
        }
      });
    };
  }, [edgesGeometry]);

  return (
    <Center>
      <group>
        {edgesGeometry.map((edge, index) => (
          <primitive key={index} object={edge} />
        ))}
      </group>
    </Center>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <lineBasicMaterial color="black" />
    </mesh>
  );
}

export function SketchViewer({ meshUrl, displaySize }: SketchViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSize = displaySize || BASE_CANVAS_SIZE;

  // Clean up GLTF cache on unmount
  useEffect(() => {
    return () => {
      useGLTF.clear(meshUrl);
    };
  }, [meshUrl]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="border border-foreground/30"
        style={{
          width: canvasSize,
          height: canvasSize,
          imageRendering: 'pixelated',
          backgroundColor: 'white',
        }}
        dpr={1}
        gl={{
          preserveDrawingBuffer: false,
          antialias: false,
          powerPreference: 'high-performance',
        }}
        // Force the actual canvas size to be GRID_SIZE
        onCreated={({ gl }) => {
          gl.setSize(GRID_SIZE, GRID_SIZE, false);
        }}
      >
        <ContextMonitor />
        {/* No lights needed for line rendering */}

        <Suspense fallback={<LoadingFallback />}>
          <SketchModel url={meshUrl} />
        </Suspense>

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
