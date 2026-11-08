import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // 1. Allow public static assets and auth API
  if (
    pathname.startsWith('/_next') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.jpg')
  ) {
    return NextResponse.next();
  }

  // 2. Allow login page
  if (pathname === '/login') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Check auth cookie
  const token = request.cookies.get('auth_token')?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    // If it is an API request, return JSON 401 instead of redirecting to login page
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized: Session expired or not logged in' },
        { status: 401 }
      );
    }
    // Web page requests redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 4. Pass sanitized user info in headers to downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId || '');
  requestHeaders.set('x-user-role', payload.role || 'admin');
  requestHeaders.set('x-user-name', payload.username || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
