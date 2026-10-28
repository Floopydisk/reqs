import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_ROUTES = ["/user", "/hod", "/hof", "/hhra", "/pm", "/vendor"];

function isTokenExpired(token: string): boolean {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    if (typeof payload.exp !== "number") return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    // Non-JWT or malformed — can't determine expiry, treat as valid.
    // The backend will reject stale tokens on API calls regardless.
    return false;
  }
}

function getUserRoot(role: string, designation: string): string {
  switch (role) {
    case "staff":
      return "/user";
    case "departmentHead":
      if (designation === "Head, Finance") return "/hof";
      if (designation === "Head, Human Resources & Admin") return "/hhra";
      return "/hod";
    case "headOfFinance":
    case "financeManager":
    case "accountsApprover":
      return "/hof";
    case "headOfHr":
    case "hrApprover":
    case "hhra":
      return "/hhra";
    case "procurementManager":
      return "/pm";
    case "vendor":
      return "/vendor";
    default:
      return "/";
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("authToken")?.value;
  const role = request.cookies.get("userRole")?.value ?? "";
  const designation = decodeURIComponent(
    request.cookies.get("userDesignation")?.value ?? ""
  );

  const authenticated = !!token && !isTokenExpired(token);

  // Login page: send authenticated users straight to their dashboard
  if (pathname === "/") {
    if (authenticated && role) {
      const root = getUserRoot(role, designation);
      if (root !== "/") {
        return NextResponse.redirect(new URL(root, request.url));
      }
    }
    return NextResponse.next();
  }

  // Determine which protected role-route this path falls under
  const matchedRoute = ROLE_ROUTES.find(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  // Not a role route (e.g. /signup, /api/…) — pass through
  if (!matchedRoute) return NextResponse.next();

  // Must have a valid session
  if (!authenticated || !role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Must be on their own role's route
  const userRoot = getUserRoot(role, designation);
  if (userRoot !== matchedRoute) {
    return NextResponse.redirect(new URL(userRoot, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
