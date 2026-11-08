import { NextResponse } from 'next/server';
import { verifyToken } from './auth';

/**
 * Authenticates an incoming API request.
 * Reads token from cookie 'auth_token' or 'Authorization: Bearer <token>'.
 * Optionally checks if user role is in allowedRoles.
 * 
 * @param {Request} request 
 * @param {string[]} [allowedRoles] 
 * @returns {Promise<{ user: object|null, errorResponse: NextResponse|null }>}
 */
export async function authenticateRequest(request, allowedRoles = null) {
  // 1. Extract token from cookie or header
  let token = null;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map((c) => {
        const [k, ...v] = c.split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );
    token = cookies['auth_token'];
  }

  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }),
    };
  }

  // 2. Check role if restricted
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = payload.role || 'admin';
    if (!allowedRoles.includes(userRole)) {
      return {
        user: payload,
        errorResponse: NextResponse.json(
          { error: `Forbidden: requires one of [${allowedRoles.join(', ')}] role` },
          { status: 403 }
        ),
      };
    }
  }

  return { user: payload, errorResponse: null };
}
