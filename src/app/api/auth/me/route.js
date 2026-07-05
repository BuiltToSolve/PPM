import { NextResponse } from 'next/server';

export async function GET(request) {
  const role = request.headers.get('x-user-role') || 'admin';
  const username = request.headers.get('x-user-name') || '';
  return NextResponse.json({ role, username });
}
