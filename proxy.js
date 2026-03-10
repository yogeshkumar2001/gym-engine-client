import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/onboarding', '/admin/login'];
const ADMIN_PATHS  = ['/admin'];
const OWNER_PATHS  = ['/dashboard', '/leads', '/members', '/renewals', '/settings', '/analytics'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token    = request.cookies.get('gym_token')?.value;
  const role     = request.cookies.get('gym_role')?.value;
  const adminKey = request.cookies.get('admin_key')?.value;

  // Public pages — allow through; redirect logged-in users away from auth pages
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    if (pathname.startsWith('/admin/login') && adminKey && role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (!pathname.startsWith('/admin/login') && token && role === 'owner') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Admin routes
  if (ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    if (!adminKey || role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    return NextResponse.next();
  }

  // Owner routes
  if (OWNER_PATHS.some((p) => pathname.startsWith(p))) {
    if (!token || role !== 'owner') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
