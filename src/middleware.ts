import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Get the pathname
  const { pathname } = request.nextUrl;

  // Allow API routes to handle their own auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow root path (login page)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // For all other routes, check if user has session token
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  // If no session token, redirect to login
  if (!sessionToken) {
    const url = new URL("/", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico|images).*)",
  ],
};
