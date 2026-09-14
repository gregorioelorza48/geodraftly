import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/", "/login", "/signup", "/dashboard", "/forgot-password", "/reset-password"]);

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? "dev-only");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/files") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("geodraftly_session")?.value;
  let signedIn = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      signedIn = true;
    } catch {
      signedIn = false;
    }
  }

  if (PUBLIC.has(pathname) || pathname.startsWith("/api/auth")) {
    if (signedIn && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
