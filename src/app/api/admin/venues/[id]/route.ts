import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth, hasRole } from '@/lib/auth';
import { Venue, UpdateVenueInput } from '@/lib/tables';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/venues/[id] - Get venue by ID
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.VENUES,
      Key: marshall({ venue_id: id }),
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    const venue = unmarshall(result.Item) as Venue;

    // Check access: super_admin can access any, venue_owner only their own
    if (auth.user?.role !== 'super_admin' && venue.owner_id !== auth.user?.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Get venue error:', error);
    return NextResponse.json(
      { error: 'Failed to get venue' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/venues/[id] - Update venue
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    // First check if venue exists and user has access
    const existing = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.VENUES,
      Key: marshall({ venue_id: id }),
    }));

    if (!existing.Item) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }

    const existingVenue = unmarshall(existing.Item) as Venue;

    // Check access
    if (auth.user?.role !== 'super_admin' && existingVenue.owner_id !== auth.user?.user_id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body: UpdateVenueInput = await req.json();

    // Build update expression
    const updateExpressions: string[] = ['#updated_at = :updated_at'];
    const expressionAttributeNames: Record<string, string> = { '#updated_at': 'updated_at' };
    const expressionAttributeValues: Record<string, unknown> = { ':updated_at': Date.now() };

    if (body.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = body.name;
    }
    if (body.address !== undefined) {
      updateExpressions.push('address = :address');
      expressionAttributeValues[':address'] = body.address;
    }
    if (body.owner_id !== undefined && auth.user?.role === 'super_admin') {
      updateExpressions.push('owner_id = :owner_id');
      expressionAttributeValues[':owner_id'] = body.owner_id;
    }
    if (body.qr_code_data !== undefined) {
      updateExpressions.push('qr_code_data = :qr_code_data');
      expressionAttributeValues[':qr_code_data'] = body.qr_code_data;
    }
    if (body.business_number !== undefined) {
      updateExpressions.push('business_number = :business_number');
      expressionAttributeValues[':business_number'] = body.business_number;
    }
    if (body.is_active !== undefined) {
      updateExpressions.push('is_active = :is_active');
      expressionAttributeValues[':is_active'] = body.is_active;
    }

    const result = await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.VENUES,
      Key: marshall({ venue_id: id }),
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    }));

    const venue = unmarshall(result.Attributes!) as Venue;

    return NextResponse.json({ venue });
  } catch (error) {
    console.error('Update venue error:', error);
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/venues/[id] - Delete venue (super_admin only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    await dynamodb.send(new DeleteItemCommand({
      TableName: TABLES.VENUES,
      Key: marshall({ venue_id: id }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete venue error:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    );
  }
}
