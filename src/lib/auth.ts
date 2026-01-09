import { createHmac, randomBytes, createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { dynamodb, TABLES } from './dynamodb';
import { User, UserRole } from './tables';
import { cookies } from 'next/headers';

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRY_HOURS = 24;

export interface AuthResult {
  valid: boolean;
  dispenserId?: string;
  error?: string;
}

/**
 * Verify HMAC signature from ESP32 device
 * Headers required:
 * - X-Dispenser-ID: Device ID
 * - X-Timestamp: Unix timestamp (seconds)
 * - X-Signature: HMAC-SHA256 signature
 */
export async function verifyDeviceAuth(req: NextRequest): Promise<AuthResult> {
  const dispenserId = req.headers.get('X-Dispenser-ID');
  const timestamp = req.headers.get('X-Timestamp');
  const signature = req.headers.get('X-Signature');

  if (!dispenserId || !timestamp || !signature) {
    return { valid: false, error: 'Missing authentication headers' };
  }

  // Verify timestamp is within tolerance
  const requestTime = parseInt(timestamp, 10) * 1000;
  const now = Date.now();
  if (Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_MS) {
    return { valid: false, error: 'Timestamp out of range' };
  }

  // Get device secret from DynamoDB
  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.DISPENSERS,
      Key: marshall({ dispenser_id: dispenserId }),
      ProjectionExpression: 'device_secret',
    }));

    if (!result.Item) {
      return { valid: false, error: 'Device not found' };
    }

    const device = unmarshall(result.Item);
    const deviceSecret = device.device_secret;

    if (!deviceSecret) {
      return { valid: false, error: 'Device not provisioned' };
    }

    // Calculate expected signature
    const payload = `${dispenserId}${timestamp}`;
    const expectedSignature = createHmac('sha256', deviceSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true, dispenserId };
  } catch (error) {
    console.error('Auth error:', error);
    return { valid: false, error: 'Authentication failed' };
  }
}

// ==================== JWT Authentication ====================

interface JWTPayload {
  user_id: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

export interface AdminAuthResult {
  valid: boolean;
  user?: {
    user_id: string;
    email: string;
    role: UserRole;
    name: string;
  };
  error?: string;
}

// Simple base64url encoding/decoding
function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

// Hash password using SHA-256 with salt
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const inputHash = createHash('sha256').update(password + salt).digest('hex');
  return inputHash === hash;
}

// Create JWT token
export function createJWT(user: Pick<User, 'user_id' | 'email' | 'role'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + JWT_EXPIRY_HOURS * 60 * 60,
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerB64}.${payloadB64}.${signature}`;
}

// Verify JWT token
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    // Verify signature
    const expectedSignature = createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) return null;

    // Parse payload
    const payload: JWTPayload = JSON.parse(base64urlDecode(payloadB64));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await dynamodb.send(new QueryCommand({
      TableName: TABLES.USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: marshall({ ':email': email }),
    }));

    if (!result.Items || result.Items.length === 0) return null;
    return unmarshall(result.Items[0]) as User;
  } catch (error) {
    console.error('getUserByEmail error:', error);
    return null;
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await dynamodb.send(new GetItemCommand({
      TableName: TABLES.USERS,
      Key: marshall({ user_id: userId }),
    }));

    if (!result.Item) return null;
    return unmarshall(result.Item) as User;
  } catch (error) {
    console.error('getUserById error:', error);
    return null;
  }
}

// Verify admin authentication from request
export async function verifyAdminAuth(req: NextRequest): Promise<AdminAuthResult> {
  // Get token from cookie or Authorization header
  const cookieToken = req.cookies.get('admin_token')?.value;
  const authHeader = req.headers.get('Authorization');
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return { valid: false, error: 'No authentication token' };
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  // Get user from database to ensure they still exist and are active
  const user = await getUserById(payload.user_id);
  if (!user || !user.is_active) {
    return { valid: false, error: 'User not found or inactive' };
  }

  return {
    valid: true,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
  };
}

// Check if user has required role
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  if (requiredRole === 'venue_owner') {
    return userRole === 'venue_owner' || userRole === 'super_admin';
  }
  return userRole === requiredRole;
}

// Middleware helper for protected routes
export async function requireAuth(
  req: NextRequest,
  requiredRole?: UserRole
): Promise<{ user: AdminAuthResult['user'] } | NextResponse> {
  const auth = await verifyAdminAuth(req);

  if (!auth.valid || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
  }

  if (requiredRole && !hasRole(auth.user.role, requiredRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user: auth.user };
}
