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
    const response = await fetch(`${ML_SERVICE_URL}/convert/${meshId}/status`, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Mesh ID not found' },
          { status: 404 }
        );
      }

      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'ML service error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/convert/[meshId]/status:', error);

    return NextResponse.json(
      { error: 'Service unavailable', message: 'Failed to connect to ML service' },
      { status: 503 }
    );
  }
}
