import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight middleware that only checks for a session cookie.
// Full auth validation happens server-side in the route handlers.
// This avoids importing Prisma (not compatible with edge runtime).
export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const signInUrl = new URL("/", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/escrow/:path*", "/listings/create"],
};
