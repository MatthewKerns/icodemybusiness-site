import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ATTRIBUTION_COOKIE_SOURCE,
  ATTRIBUTION_COOKIE_VARIANT,
  COOKIE_MAX_AGE,
  VALID_COOKIE_VALUE,
} from "@/lib/constants";

export function applyAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const src = request.nextUrl.searchParams.get("src");
  const variant = request.nextUrl.searchParams.get("variant");

  if (src && VALID_COOKIE_VALUE.test(src)) {
    response.cookies.set(ATTRIBUTION_COOKIE_SOURCE, src, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  if (variant && VALID_COOKIE_VALUE.test(variant)) {
    response.cookies.set(ATTRIBUTION_COOKIE_VARIANT, variant, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
