import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/db';
import { signToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const collection = await getCollection('users');
    const user = await collection.findOne({ username: username.trim() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    let isValid = false;
    const isBcryptHash = typeof user.password === 'string' && user.password.startsWith('$2');

    if (isBcryptHash) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      // Backwards compatibility for legacy unhashed passwords: verify and immediately upgrade hash
      if (user.password === password) {
        isValid = true;
        const newHash = await bcrypt.hash(password, 12);
        await collection.updateOne(
          { _id: user._id },
          { $set: { password: newHash, updatedAt: new Date() } }
        );
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Create JWT
    const token = await signToken({ 
      userId: user._id.toString(), 
      username: user.username,
      role: user.role || 'admin'
    });

    // Set cookie
    const isHttps = new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
    const response = NextResponse.json({ success: true, username: user.username, role: user.role || 'admin' });
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && isHttps,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
