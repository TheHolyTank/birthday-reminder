import { NextResponse } from "next/server";
import { verifySessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function middleware(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const userId = await verifySessionToken(token);
  const { pathname } = request.nextUrl;

  if (userId === null) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", String(userId)); // always overwritten here — never trust a client-sent value
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!login|signup|api/login|api/signup|api/cron/check-birthdays|_next/static|_next/image|favicon.ico).*)",
  ],
};
