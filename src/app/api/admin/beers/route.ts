import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth } from '@/lib/auth';
import { Beer, CreateBeerInput } from '@/lib/tables';
import { randomUUID } from 'crypto';

// GET /api/admin/beers - List all beers
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: TABLES.BEERS,
    }));

    const beers = (result.Items || []).map(item => unmarshall(item) as Beer);

    // Sort by name
    beers.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ beers });
  } catch (error) {
    console.error('List beers error:', error);
    return NextResponse.json(
      { error: 'Failed to list beers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/beers - Create new beer (super_admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const body: CreateBeerInput = await req.json();

    if (!body.name || !body.brand) {
      return NextResponse.json(
        { error: 'Name and brand are required' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const beer: Beer = {
      beer_id: randomUUID(),
      name: body.name,
      brand: body.brand,
      style: body.style || 'Lager',
      abv: body.abv ?? 5.0,
      description: body.description,
      image_url: body.image_url,
      default_price: body.default_price ?? 5000,
      default_volume_ml: body.default_volume_ml ?? 500,
      is_active: body.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.BEERS,
      Item: marshall(beer, { removeUndefinedValues: true }),
    }));

    return NextResponse.json({ beer }, { status: 201 });
  } catch (error) {
    console.error('Create beer error:', error);
    return NextResponse.json(
      { error: 'Failed to create beer' },
      { status: 500 }
    );
  }
}
