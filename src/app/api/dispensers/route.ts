import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';

/**
 * GET /api/dispensers
 * List all dispensers (optionally filtered by owner_id)
 */
export async function GET(req: NextRequest) {
  try {
    const ownerId = req.nextUrl.searchParams.get('owner_id');

    let items: Record<string, unknown>[] = [];

    if (ownerId) {
      // Query by owner_id (requires GSI on owner_id)
      const result = await dynamodb.send(new QueryCommand({
        TableName: TABLES.DISPENSERS,
        IndexName: 'owner_id-index',
        KeyConditionExpression: 'owner_id = :oid',
        ExpressionAttributeValues: {
          ':oid': { S: ownerId },
        },
      }));
      items = (result.Items || []).map(item => unmarshall(item));
    } else {
      // Scan all (for admin use, should be paginated in production)
      const result = await dynamodb.send(new ScanCommand({
        TableName: TABLES.DISPENSERS,
        Limit: 100,
      }));
      items = (result.Items || []).map(item => unmarshall(item));
    }

    // Remove sensitive fields
    const sanitized = items.map(item => {
      const { device_secret, ...rest } = item as Record<string, unknown>;
      return rest;
    });

    return NextResponse.json({
      dispensers: sanitized,
      count: sanitized.length,
    });
  } catch (error) {
    console.error('List dispensers error:', error);
    return NextResponse.json(
      { error: 'Failed to list dispensers' },
      { status: 500 }
    );
  }
}
