import os
import logging
import numpy as np
import trimesh
from PIL import Image

logger = logging.getLogger(__name__)

class DemoMeshGenerator:
    """
    Demo mesh generator that creates simple 3D shapes based on sketch analysis
    This is a placeholder until real sketch2mesh models are available
    """

    @staticmethod
    async def generate_mesh_from_sketch(
        sketch_path: str,
        model_type: str,
        output_path: str
    ) -> bool:
        """
        Generate a simple 3D mesh based on sketch analysis

        Args:
            sketch_path: Path to the input sketch image
            model_type: Type of model ("cars" or "chairs") - affects shape
            output_path: Path to save the output GLB file

        Returns:
            bool: True if generation successful, False otherwise
        """
        try:
            logger.info(f"Analyzing sketch at {sketch_path}")

            # Load and analyze the sketch
            img = Image.open(sketch_path).convert('L')  # Convert to grayscale
            img_array = np.array(img)

            # Calculate sketch properties
            non_white_pixels = np.sum(img_array < 200)  # Count drawn pixels
            total_pixels = img_array.size
            coverage = non_white_pixels / total_pixels

            # Get bounding box of drawing
            rows = np.any(img_array < 200, axis=1)
            cols = np.any(img_array < 200, axis=0)
            if rows.any() and cols.any():
                ymin, ymax = np.where(rows)[0][[0, -1]]
                xmin, xmax = np.where(cols)[0][[0, -1]]
                width = xmax - xmin
                height = ymax - ymin
                aspect_ratio = width / max(height, 1)
            else:
                aspect_ratio = 1.0
                width = height = 0

            logger.info(f"Sketch analysis: coverage={coverage:.2%}, aspect={aspect_ratio:.2f}")

            # Generate mesh based on model type and sketch properties
            if model_type == "cars":
                mesh = DemoMeshGenerator._generate_car_like_mesh(
                    coverage, aspect_ratio, width, height
                )
            else:  # chairs
                mesh = DemoMeshGenerator._generate_chair_like_mesh(
                    coverage, aspect_ratio, width, height
                )

            # Export to GLB
            mesh.export(output_path, file_type='glb')

            logger.info(f"Generated demo mesh at {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error generating demo mesh: {str(e)}")
            return False

    @staticmethod
    def _generate_car_like_mesh(coverage: float, aspect_ratio: float, width: int, height: int) -> trimesh.Trimesh:
        """Generate a car-like shape"""
        # Create a car-like shape using boxes

        # Main body (scaled by sketch dimensions)
        scale_x = max(2.0, aspect_ratio * 1.5)
        scale_y = 0.8
        scale_z = 1.2

        body = trimesh.creation.box(extents=[scale_x, scale_y, scale_z])

        # Roof (smaller, on top)
        roof = trimesh.creation.box(extents=[scale_x * 0.6, scale_y, scale_z * 0.5])
        roof.apply_translation([0, 0, scale_z * 0.7])

        # Wheels (4 cylinders)
        wheel_radius = 0.3
        wheel_height = 0.2

        wheels = []
        positions = [
            [scale_x * 0.4, scale_y * 0.6, -scale_z * 0.3],
            [scale_x * 0.4, -scale_y * 0.6, -scale_z * 0.3],
            [-scale_x * 0.4, scale_y * 0.6, -scale_z * 0.3],
            [-scale_x * 0.4, -scale_y * 0.6, -scale_z * 0.3],
        ]

        for pos in positions:
            wheel = trimesh.creation.cylinder(
                radius=wheel_radius,
                height=wheel_height,
                sections=16
            )
            # Rotate to align with Y axis
            wheel.apply_transform(trimesh.transformations.rotation_matrix(
                np.pi / 2, [1, 0, 0]
            ))
            wheel.apply_translation(pos)
            wheels.append(wheel)

        # Combine all parts
        meshes = [body, roof] + wheels
        combined = trimesh.util.concatenate(meshes)

        # Center and scale based on coverage (more coverage = larger model)
        scale_factor = 0.5 + (coverage * 1.5)
        combined.apply_scale(scale_factor)

        return combined

    @staticmethod
    def _generate_chair_like_mesh(coverage: float, aspect_ratio: float, width: int, height: int) -> trimesh.Trimesh:
        """Generate a chair-like shape"""

        # Seat
        seat = trimesh.creation.box(extents=[1.5, 1.5, 0.2])
        seat.apply_translation([0, 0, 1.0])

        # Backrest
        backrest = trimesh.creation.box(extents=[1.5, 0.2, 1.5])
        backrest.apply_translation([0, -0.7, 1.8])

        # Legs (4 cylinders)
        leg_radius = 0.08
        leg_height = 1.0

        legs = []
        positions = [
            [0.6, 0.6, leg_height / 2],
            [0.6, -0.6, leg_height / 2],
            [-0.6, 0.6, leg_height / 2],
            [-0.6, -0.6, leg_height / 2],
        ]

        for pos in positions:
            leg = trimesh.creation.cylinder(
                radius=leg_radius,
                height=leg_height,
                sections=12
            )
            leg.apply_translation(pos)
            legs.append(leg)

        # Combine all parts
        meshes = [seat, backrest] + legs
        combined = trimesh.util.concatenate(meshes)

        # Scale based on coverage
        scale_factor = 0.5 + (coverage * 1.5)
        combined.apply_scale(scale_factor)

        return combined
