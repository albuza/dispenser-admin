import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth } from '@/lib/auth';
import { Beer, UpdateBeerInput } from '@/lib/tables';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/beers/[id] - Get beer by ID
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'venue_owner');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.BEERS,
      Key: marshall({ beer_id: id }),
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'Beer not found' },
        { status: 404 }
      );
    }

    const beer = unmarshall(result.Item) as Beer;

    return NextResponse.json({ beer });
  } catch (error) {
    console.error('Get beer error:', error);
    return NextResponse.json(
      { error: 'Failed to get beer' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/beers/[id] - Update beer (super_admin only)
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body: UpdateBeerInput = await req.json();

    // Build update expression
    const updateExpressions: string[] = ['#updated_at = :updated_at'];
    const expressionAttributeNames: Record<string, string> = { '#updated_at': 'updated_at' };
    const expressionAttributeValues: Record<string, unknown> = { ':updated_at': Date.now() };

    if (body.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = body.name;
    }
    if (body.brand !== undefined) {
      updateExpressions.push('brand = :brand');
      expressionAttributeValues[':brand'] = body.brand;
    }
    if (body.style !== undefined) {
      updateExpressions.push('style = :style');
      expressionAttributeValues[':style'] = body.style;
    }
    if (body.abv !== undefined) {
      updateExpressions.push('abv = :abv');
      expressionAttributeValues[':abv'] = body.abv;
    }
    if (body.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = body.description;
    }
    if (body.image_url !== undefined) {
      updateExpressions.push('image_url = :image_url');
      expressionAttributeValues[':image_url'] = body.image_url;
    }
    if (body.default_price !== undefined) {
      updateExpressions.push('default_price = :default_price');
      expressionAttributeValues[':default_price'] = body.default_price;
    }
    if (body.default_volume_ml !== undefined) {
      updateExpressions.push('default_volume_ml = :default_volume_ml');
      expressionAttributeValues[':default_volume_ml'] = body.default_volume_ml;
    }
    if (body.is_active !== undefined) {
      updateExpressions.push('is_active = :is_active');
      expressionAttributeValues[':is_active'] = body.is_active;
    }

    const result = await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.BEERS,
      Key: marshall({ beer_id: id }),
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    }));

    const beer = unmarshall(result.Attributes!) as Beer;

    return NextResponse.json({ beer });
  } catch (error) {
    console.error('Update beer error:', error);
    return NextResponse.json(
      { error: 'Failed to update beer' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/beers/[id] - Delete beer (super_admin only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    await dynamodb.send(new DeleteItemCommand({
      TableName: TABLES.BEERS,
      Key: marshall({ beer_id: id }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete beer error:', error);
    return NextResponse.json(
      { error: 'Failed to delete beer' },
      { status: 500 }
    );
  }
}
