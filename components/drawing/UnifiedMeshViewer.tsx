'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import { Suspense, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GRID_SIZE, BASE_CANVAS_SIZE, COLORS } from '@/lib/constants';

interface UnifiedMeshViewerProps {
  meshUrl: string;
  mode: 'full' | 'sketch';
  displaySize?: number;
  isDarkMode?: boolean;
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

function CanvasSizeController({ mode }: { mode: 'full' | 'sketch' }) {
  const { gl, size } = useThree();

  useEffect(() => {
    if (mode === 'sketch') {
      // Force canvas to render at GRID_SIZE x GRID_SIZE pixels
      gl.domElement.width = GRID_SIZE;
      gl.domElement.height = GRID_SIZE;
      gl.setViewport(0, 0, GRID_SIZE, GRID_SIZE);
    } else {
      // Reset to normal size based on container
      gl.setSize(size.width, size.height, false);
      gl.setViewport(0, 0, size.width, size.height);
    }
  }, [mode, gl, size]);

  return null;
}

function MeshModel({ url, mode, isDarkMode }: { url: string; mode: 'full' | 'sketch'; isDarkMode: boolean }) {
  const { scene } = useGLTF(url);

  // Extract edges and solid meshes for sketch mode
  const sketchData = useMemo(() => {
    if (mode !== 'sketch') return { edges: [], meshes: [] };

    const edges: THREE.LineSegments[] = [];
    const meshes: { geometry: THREE.BufferGeometry; position: THREE.Vector3; rotation: THREE.Euler; scale: THREE.Vector3 }[] = [];

    // Get edge color based on dark mode
    const edgeColor = isDarkMode ? 0xededed : 0x000000;

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Store mesh data for solid rendering
        meshes.push({
          geometry: child.geometry,
          position: child.position.clone(),
          rotation: child.rotation.clone(),
          scale: child.scale.clone(),
        });

        // Create edges
        const edgesGeom = new THREE.EdgesGeometry(child.geometry, 15);
        const edgesMaterial = new THREE.LineBasicMaterial({
          color: edgeColor,
          linewidth: 1,
          depthTest: true,
          depthWrite: true,
        });
        const edgesLine = new THREE.LineSegments(edgesGeom, edgesMaterial);

        edgesLine.position.copy(child.position);
        edgesLine.rotation.copy(child.rotation);
        edgesLine.scale.copy(child.scale);
        edgesLine.renderOrder = 1;

        edges.push(edgesLine);
      }
    });

    return { edges, meshes };
  }, [scene, mode, isDarkMode]);

  // Cleanup edges on unmount or mode change
  useEffect(() => {
    return () => {
      sketchData.edges.forEach(edge => {
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
  }, [sketchData]);

  return (
    <Center>
      {mode === 'full' ? (
        <primitive object={scene} />
      ) : (

        <group>
          {/* Render solid meshes invisibly for depth testing only */}
          {sketchData.meshes.map((meshData, index) => (
            <mesh
              key={`solid-${index}`}
              geometry={meshData.geometry}
              position={meshData.position}
              rotation={meshData.rotation}
              scale={meshData.scale}
              renderOrder={0}
            >
              <meshBasicMaterial
                colorWrite={false}
                depthWrite={true}
                depthTest={true}
                side={THREE.DoubleSide}
                polygonOffset={true}
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            </mesh>
          ))}
          {/* Render edges on top with depth testing */}
          {sketchData.edges.map((edge, index) => (
            <primitive key={`edge-${index}`} object={edge} />
          ))}
        </group>
      )}
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

export function UnifiedMeshViewer({ meshUrl, mode, displaySize, isDarkMode = false }: UnifiedMeshViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSize = displaySize || BASE_CANVAS_SIZE;
  const isSketchMode = mode === 'sketch';
  const colorScheme = isDarkMode ? COLORS.dark : COLORS.light;

  // Clean up GLTF cache on unmount
  useEffect(() => {
    return () => {
      useGLTF.clear(meshUrl);
    };
  }, [meshUrl]);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      <div
        className="border border-foreground/30"
        style={{
          width: canvasSize,
          height: canvasSize,
          backgroundColor: isSketchMode ? colorScheme.background : 'transparent',
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{
            width: '100%',
            height: '100%',
            imageRendering: isSketchMode ? 'pixelated' : 'auto',
          }}
          dpr={isSketchMode ? 1 : [1, 2]}
          gl={{
            preserveDrawingBuffer: false,
            antialias: false,
            powerPreference: 'high-performance',
          }}
        >
        <ContextMonitor />
        <CanvasSizeController mode={mode} />

        {!isSketchMode && (
          <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          </>
        )}

        <Suspense fallback={<LoadingFallback />}>
          <MeshModel url={meshUrl} mode={mode} isDarkMode={isDarkMode} />
        </Suspense>

        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          zoomSpeed={0.6}
          panSpeed={0.5}
          rotateSpeed={0.4}
        />

        {!isSketchMode && (
          <gridHelper args={[10, 10, 0x888888, 0x444444]} />
        )}
      </Canvas>
      </div>
    </div>
  );
}
