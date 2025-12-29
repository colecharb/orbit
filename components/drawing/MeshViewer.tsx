'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import { Suspense, useEffect, useRef, useCallback } from 'react';

interface MeshViewerProps {
  meshUrl: string;
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

function MeshModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  return (
    <Center>
      <primitive object={scene} />
    </Center>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="gray" wireframe />
    </mesh>
  );
}

export function MeshViewer({ meshUrl }: MeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean up GLTF cache on unmount
  useEffect(() => {
    return () => {
      useGLTF.clear(meshUrl);
    };
  }, [meshUrl]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        className="w-full h-full"
        dpr={[1, 2]}
        gl={{
          preserveDrawingBuffer: false,
          antialias: true,
          powerPreference: 'high-performance',
        }}
      >
        <ContextMonitor />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        <Suspense fallback={<LoadingFallback />}>
          <MeshModel url={meshUrl} />
        </Suspense>

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
        />

        <gridHelper args={[10, 10, 0x888888, 0x444444]} />
      </Canvas>
    </div>
  );
}
