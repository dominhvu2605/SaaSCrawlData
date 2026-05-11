import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/crawl", "/history", "/schedule"];
const AUTH_PATHS = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only check cookie existence in middleware (edge-compatible).
  // Actual JWT verification happens in getCurrentUser() on the server.
  const token = req.cookies.get("crawdata_token")?.value;
  const isAuthenticated = !!token;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url)
    );
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/crawl/:path*", "/history/:path*", "/schedule/:path*", "/login", "/register"],
};
