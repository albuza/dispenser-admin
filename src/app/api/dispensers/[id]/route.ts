import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/dispensers/[id]
 * Get a single dispenser by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
    }));

    if (!result.Item) {
      return NextResponse.json({ error: 'Dispenser not found' }, { status: 404 });
    }

    const item = unmarshall(result.Item);

    // Remove sensitive fields
    const { device_secret, ...sanitized } = item;

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Get dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to get dispenser' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dispensers/[id]
 * Update dispenser metadata (name, location)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await req.json();
    const { name, location } = body;

    const updateExpressions: string[] = ['updated_at = :now'];
    const expressionValues: Record<string, unknown> = {
      ':now': Date.now(),
    };
    const expressionNames: Record<string, string> = {};

    if (name !== undefined) {
      updateExpressions.push('#n = :name');
      expressionValues[':name'] = name;
      expressionNames['#n'] = 'name';
    }

    if (location !== undefined) {
      updateExpressions.push('#loc = :location');
      expressionValues[':location'] = location;
      expressionNames['#loc'] = 'location';
    }

    await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: id }),
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeValues: marshall(expressionValues),
      ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update dispenser error:', error);
    return NextResponse.json(
      { error: 'Failed to update dispenser' },
      { status: 500 }
    );
  }
}
