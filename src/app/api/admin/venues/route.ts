import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth } from '@/lib/auth';
import { Venue, CreateVenueInput } from '@/lib/tables';
import { randomUUID } from 'crypto';

// GET /api/admin/venues - List all venues (super_admin) or owned venues (venue_owner)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  try {
    let venues: Venue[];

    if (auth.user?.role === 'super_admin') {
      // Super admin can see all venues
      const result = await dynamodb.send(new ScanCommand({
        TableName: TABLES.VENUES,
      }));
      venues = (result.Items || []).map(item => unmarshall(item) as Venue);
    } else {
      // Venue owner can only see their venues
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.VENUES,
        IndexName: 'owner_id-index',
        KeyConditionExpression: 'owner_id = :owner_id',
        ExpressionAttributeValues: marshall({ ':owner_id': auth.user?.user_id }),
      }));
      venues = (result.Items || []).map(item => unmarshall(item) as Venue);
    }

    // Sort by created_at descending
    venues.sort((a, b) => b.created_at - a.created_at);

    return NextResponse.json({ venues });
  } catch (error) {
    console.error('List venues error:', error);
    return NextResponse.json(
      { error: 'Failed to list venues' },
      { status: 500 }
    );
  }
}

// POST /api/admin/venues - Create new venue (super_admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const body: CreateVenueInput = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const venue: Venue = {
      venue_id: randomUUID(),
      name: body.name,
      address: body.address || '',
      owner_id: body.owner_id || '',
      qr_code_data: body.qr_code_data,
      business_number: body.business_number,
      is_active: body.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.VENUES,
      Item: marshall(venue, { removeUndefinedValues: true }),
    }));

    return NextResponse.json({ venue }, { status: 201 });
  } catch (error) {
    console.error('Create venue error:', error);
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
}
