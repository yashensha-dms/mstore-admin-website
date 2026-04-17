import { NextResponse } from "next/server";
import { fallbackLng, languages } from "./app/i18n/settings";
import { replacePath } from './Utils/CustomFunctions/ReplacePath';
import ConvertPermissionArr from './Utils/CustomFunctions/ConvertPermissionArr';

const cookieName = 'i18next'

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const lng = fallbackLng;

  if (path.split("/")[2] !== "auth" && !request.cookies.has("uat")) {
    return NextResponse.redirect(new URL(`/${lng}/auth/login`, request.url));
  }

  if (path.split("/")[2] == "auth" && request.cookies.has("uat")) {
    return NextResponse.redirect(new URL(`/${lng}/dashboard`, request.url));
  }

  if (path != `/${lng}/auth/login`) {
    if (path == `/${lng}/auth/otp-verification` && !request.cookies.has("ue")) {
      return NextResponse.redirect(new URL(`/${lng}/auth/login`, request.url));
    }
    if (path == `/${lng}/auth/update-password` && (!request.cookies.has("uo") || !request.cookies.has("ue"))) {
      return NextResponse.redirect(new URL(`/${lng}/auth/login`, request.url));
    }
  }

  if (request.headers.get("x-redirected")) {
    // Request is already redirected, skip middleware
    return NextResponse.next();
  }

  // Redirect if lng in path is not supported
  if (
    !languages.some(loc => request.nextUrl.pathname.startsWith(`/${loc}`)) &&
    !request.nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.redirect(new URL(`/${lng}${request.nextUrl.pathname}`, request.url))
  }
  // Permission check: only for authenticated non-auth routes
  // Strategy: always prefer the account cookie (set at login) — only call API as last resort
  const needsPermissionCheck = request.cookies.has("uat") && !path.split("/")[2]?.startsWith("auth");

  if (needsPermissionCheck) {
    let data = null;

    // Step 1: Try cookie first — no network call needed
    if (request.cookies.has("account")) {
      try {
        data = JSON.parse(request.cookies.get("account")?.value || '{}');
      } catch (e) {
        data = null;
      }
    }

    // Step 3: Check permissions — try both 'permissions' and 'permission' keys (API may return either)
    const permissionsArr = data?.permissions || data?.permission;
    if (permissionsArr?.length) {
      const securePaths = ConvertPermissionArr(permissionsArr);
      const currentModule = replacePath(path?.split("/")[2]);
      // Skip permission check for core always-accessible modules
      const publicModules = ["dashboard", "403", "account", "notifications", "checkout"];
      if (currentModule && !publicModules.includes(currentModule)) {
        const matchedPath = securePaths?.find((item) => item?.name == currentModule);
        if (!matchedPath || matchedPath.permissionsArr.length === 0) {
          return NextResponse.redirect(new URL(`/${lng}/403`, request.url));
        }
      }
    }
  }

}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};