import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meshId: string }> }
) {
  try {
    const { meshId } = await params;

    // Forward the request to the ML service
    const response = await fetch(`${ML_SERVICE_URL}/convert/${meshId}/download`, {
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Mesh file not found' },
          { status: 404 }
        );
      }

      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        return NextResponse.json(error, { status: 400 });
      }

      return NextResponse.json(
        { error: 'ML service error' },
        { status: response.status }
      );
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Return the blob with appropriate headers
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `attachment; filename="mesh-${meshId}.glb"`,
      },
    });

  } catch (error) {
    console.error('Error in /api/convert/[meshId]/download:', error);

    return NextResponse.json(
      { error: 'Service unavailable', message: 'Failed to connect to ML service' },
      { status: 503 }
    );
  }
}
