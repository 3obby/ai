import { NextRequest, NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const anonymous = searchParams.get('anonymous') === 'true';

  // In Next.js 15, cookies() is async and must be awaited
  // (currently this isn't being used, but keeping it for future use)
  const cookieStore = await cookies();

  // If this is an anonymous sign-in request, redirect directly to dashboard
  if (anonymous) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For regular sign-ins, just redirect to the login page
  return NextResponse.redirect(new URL('/login', request.url));
} 