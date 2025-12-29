import os
import logging
import trimesh

logger = logging.getLogger(__name__)

class MeshConverter:
    """Handles mesh file format conversions"""

    @staticmethod
    def obj_to_glb(obj_path: str, glb_path: str) -> bool:
        """
        Convert an OBJ file to GLB format

        Args:
            obj_path: Path to the source OBJ file
            glb_path: Path to save the GLB file

        Returns:
            bool: True if conversion successful, False otherwise
        """
        try:
            if not os.path.exists(obj_path):
                logger.error(f"Source OBJ file not found: {obj_path}")
                return False

            logger.info(f"Converting {obj_path} to GLB format...")

            # Load the mesh from OBJ file
            mesh = trimesh.load(obj_path, force='mesh')

            # Handle multiple meshes or scenes
            if isinstance(mesh, trimesh.Scene):
                # If it's a scene with multiple meshes, combine them
                logger.info("Scene contains multiple meshes, combining...")
                mesh = mesh.dump(concatenate=True)

            # Export to GLB format
            mesh.export(glb_path, file_type='glb')

            # Verify the output file was created
            if not os.path.exists(glb_path):
                logger.error(f"GLB file was not created: {glb_path}")
                return False

            file_size = os.path.getsize(glb_path) / (1024 * 1024)  # Convert to MB
            logger.info(f"Successfully converted to GLB ({file_size:.2f}MB): {glb_path}")

            return True

        except Exception as e:
            logger.error(f"Error converting OBJ to GLB: {str(e)}")
            return False

    @staticmethod
    def optimize_mesh(mesh_path: str, target_faces: int = 10000) -> bool:
        """
        Optimize a mesh by reducing face count

        Args:
            mesh_path: Path to the mesh file
            target_faces: Target number of faces (default: 10000)

        Returns:
            bool: True if optimization successful, False otherwise
        """
        try:
            logger.info(f"Optimizing mesh at {mesh_path}")

            # Load the mesh
            mesh = trimesh.load(mesh_path)

            if isinstance(mesh, trimesh.Scene):
                mesh = mesh.dump(concatenate=True)

            original_faces = len(mesh.faces)

            # Only simplify if mesh has more faces than target
            if original_faces > target_faces:
                logger.info(f"Simplifying mesh from {original_faces} to {target_faces} faces")
                mesh = mesh.simplify_quadric_decimation(target_faces)

                # Save the optimized mesh
                mesh.export(mesh_path, file_type='glb')

                new_faces = len(mesh.faces)
                logger.info(f"Mesh optimized: {original_faces} -> {new_faces} faces")
            else:
                logger.info(f"Mesh already optimal ({original_faces} faces)")

            return True

        except Exception as e:
            logger.error(f"Error optimizing mesh: {str(e)}")
            return False
