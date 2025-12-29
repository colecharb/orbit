import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();

    // Forward the request to the ML service
    const response = await fetch(`${ML_SERVICE_URL}/convert`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(300000), // 5 minute timeout
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'ML service error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/convert:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timed out', message: 'The conversion is taking too long' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Service unavailable', message: 'Failed to connect to ML service' },
      { status: 503 }
    );
  }
}
