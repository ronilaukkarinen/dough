import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

function clearAndRedirect() {
  const response = NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_URL || "http://localhost:3001"));
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  console.info("[api/auth/logout] User logged out");
  return response;
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(`${origin}/login`);
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  console.info("[api/auth/logout] User logged out via GET");
  return response;
}

export async function POST() {
  return clearAndRedirect();
}
