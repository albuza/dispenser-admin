import { NextRequest, NextResponse } from 'next/server';
import { ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from '@/lib/dynamodb';
import { requireAuth, hashPassword, getUserByEmail } from '@/lib/auth';
import { User, CreateUserInput } from '@/lib/tables';
import { randomUUID } from 'crypto';

// GET /api/admin/users - List all users (super_admin only)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await dynamodb.send(new ScanCommand({
      TableName: TABLES.USERS,
      ProjectionExpression: 'user_id, email, #name, phone, #role, is_active, created_at, updated_at',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#role': 'role',
      },
    }));

    const users = (result.Items || []).map(item => unmarshall(item));

    // Sort by created_at descending
    users.sort((a, b) => b.created_at - a.created_at);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user (super_admin only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, 'super_admin');
  if (auth instanceof NextResponse) return auth;

  try {
    const body: CreateUserInput = await req.json();

    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await getUserByEmail(body.email);
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const user: User = {
      user_id: randomUUID(),
      email: body.email,
      password_hash: hashPassword(body.password),
      name: body.name,
      phone: body.phone,
      role: body.role || 'venue_owner',
      is_active: body.is_active ?? true,
      created_at: now,
      updated_at: now,
    };

    await dynamodb.send(new PutItemCommand({
      TableName: TABLES.USERS,
      Item: marshall(user, { removeUndefinedValues: true }),
    }));

    // Return user without password_hash
    const { password_hash, ...safeUser } = user;

    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
