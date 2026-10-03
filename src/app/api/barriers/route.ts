import { NextRequest, NextResponse } from 'next/server';
import { createBarrier, getAllBarriers, uploadBarrierImage } from '@/services/barriers';
import { BarrierType, CreateBarrierInput } from '@/types/barrier';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/services/auth';

export async function GET() {
  try {
    const barriers = await getAllBarriers();
    return NextResponse.json({ count: barriers.length, barriers });
  } catch (error: any) {
    console.error('API /api/barriers GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd pobierania barier.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let barrierInput: CreateBarrierInput;
    let uploadedImageUrl: string | null = null;

    // Detect authenticated user from session cookie or auth header
    const sessionCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    const authHeader = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const token = sessionCookie || authHeader;
    const sessionUser = token ? verifySessionToken(token) : null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const barrierType = (formData.get('barrier_type') as BarrierType) || 'STAIRS';
      const latitude = parseFloat(formData.get('latitude') as string);
      const longitude = parseFloat(formData.get('longitude') as string);
      const addressDescription = (formData.get('address_description') as string) || '';
      const rawDetails = formData.get('details');
      const explicitCreatedBy = formData.get('created_by') as string | null;

      let details: Record<string, any> = {};
      if (typeof rawDetails === 'string') {
        try {
          details = JSON.parse(rawDetails);
        } catch {
          details = { raw: rawDetails };
        }
      }

      // Check for uploaded photo
      const photoFile = formData.get('photo') as File | null;
      if (photoFile && photoFile.size > 0) {
        const arrayBuffer = await photoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        uploadedImageUrl = await uploadBarrierImage(buffer, photoFile.name, photoFile.type);
      }

      barrierInput = {
        barrier_type: barrierType,
        latitude,
        longitude,
        address_description: addressDescription,
        details,
        source: 'CROWDSOURCED',
        status: 'UNVERIFIED',
        confidence_score: 0.5,
        image_url: uploadedImageUrl,
        created_by: sessionUser?.id || explicitCreatedBy || null,
      };
    } else {
      const body = await req.json();
      barrierInput = {
        barrier_type: body.barrier_type,
        latitude: body.latitude,
        longitude: body.longitude,
        address_description: body.address_description,
        details: body.details || {},
        source: body.source || 'CROWDSOURCED',
        status: body.status || 'UNVERIFIED',
        confidence_score: typeof body.confidence_score === 'number' ? body.confidence_score : 0.5,
        image_url: body.image_url || null,
        created_by: sessionUser?.id || body.created_by || null,
      };
    }

    if (!barrierInput.barrier_type || isNaN(barrierInput.latitude) || isNaN(barrierInput.longitude)) {
      return NextResponse.json(
        { error: 'Wymagane pola: barrier_type, latitude, longitude.' },
        { status: 400 }
      );
    }

    const created = await createBarrier(barrierInput);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/barriers POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Błąd zapisywania bariery.' },
      { status: 500 }
    );
  }
}
