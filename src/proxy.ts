import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { auth } from "@/auth";

export default async function middleware(request: NextRequest) {
  // 1. Update Supabase session if needed
  const supabaseResponse = await updateSession(request);

  // 2. Next-Auth Protection
  const session = await auth();
  const isLoggedIn = !!session;
  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Redirect logged-in users away from the login page
  if (request.nextUrl.pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
