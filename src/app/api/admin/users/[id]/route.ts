import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth, hashPassword } from '@/lib/auth';
import { User, UpdateUserInput } from '@/lib/tables';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/admin/users/[id] - Get user by ID (super_admin only)
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.USERS,
      Key: marshall({ user_id: id }),
      ProjectionExpression: 'user_id, email, #name, phone, #role, is_active, created_at, updated_at',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#role': 'role',
      },
    }));

    if (!result.Item) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = unmarshall(result.Item);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user (super_admin only)
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const body: UpdateUserInput = await req.json();

    // Build update expression
    const updateExpressions: string[] = ['#updated_at = :updated_at'];
    const expressionAttributeNames: Record<string, string> = { '#updated_at': 'updated_at' };
    const expressionAttributeValues: Record<string, unknown> = { ':updated_at': Date.now() };

    if (body.email !== undefined) {
      updateExpressions.push('email = :email');
      expressionAttributeValues[':email'] = body.email;
    }
    if (body.name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = body.name;
    }
    if (body.phone !== undefined) {
      updateExpressions.push('phone = :phone');
      expressionAttributeValues[':phone'] = body.phone;
    }
    if (body.role !== undefined) {
      updateExpressions.push('#role = :role');
      expressionAttributeNames['#role'] = 'role';
      expressionAttributeValues[':role'] = body.role;
    }
    if (body.is_active !== undefined) {
      updateExpressions.push('is_active = :is_active');
      expressionAttributeValues[':is_active'] = body.is_active;
    }
    if (body.password) {
      updateExpressions.push('password_hash = :password_hash');
      expressionAttributeValues[':password_hash'] = hashPassword(body.password);
    }

    const result = await dynamodb.send(new UpdateItemCommand({
      TableName: TABLES.USERS,
      Key: marshall({ user_id: id }),
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
      ReturnValues: 'ALL_NEW',
    }));

    const user = unmarshall(result.Attributes!) as User;

    // Return user without password_hash
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (super_admin only)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  // Prevent deleting yourself
  if (id === auth.user?.user_id) {
    return NextResponse.json(
      { error: 'Cannot delete your own account' },
      { status: 400 }
    );
  }

  try {
    await dynamodb.send(new DeleteItemCommand({
      TableName: TABLES.USERS,
      Key: marshall({ user_id: id }),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
