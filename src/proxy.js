import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Allow public assets and login/logout API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/migrate') ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow login page
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Check auth cookie
  const token = request.cookies.get('auth_token')?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    // Redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Clone headers and add user role
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', payload.role || 'admin');
  requestHeaders.set('x-user-name', payload.username || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
