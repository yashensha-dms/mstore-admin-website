import acceptLanguage from 'accept-language';
import { NextResponse } from "next/server";
import { fallbackLng, languages } from "./app/i18n/settings";
import { replacePath } from './Utils/CustomFunctions/ReplacePath';
import ConvertPermissionArr from './Utils/CustomFunctions/ConvertPermissionArr';
import { selfData } from './Utils/AxiosUtils/API';

acceptLanguage.languages(languages)

const cookieName = 'i18next'

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  let lng
  if (request.cookies.has(cookieName)) lng = acceptLanguage.get(request.cookies.get(cookieName).value)
  if (!lng) lng = acceptLanguage.get(request.headers.get('Accept-Language'))
  if (!lng) lng = fallbackLng

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
  if (request.headers.has('referer')) {
    const refererUrl = new URL(request.headers.get('referer'))
    const lngInReferer = languages.find((l) => refererUrl.pathname.startsWith(`/${l}`))
    if (lngInReferer) {
      const response = NextResponse.next();
      response.cookies.set(cookieName, lngInReferer);
      // We don't return here so we can proceed to permission checks if needed
    }
  }

  // Permission check: only for authenticated non-auth routes
  // Strategy: always prefer the account cookie (set at login) — only call API as last resort
  const needsPermissionCheck = request.cookies.has("uat") && !path.split("/")[2]?.startsWith("auth");

  if (needsPermissionCheck) {
    const token = request.cookies.get("uat")?.value;
    let data = null;

    // Step 1: Try cookie first — no network call needed
    if (request.cookies.has("account")) {
      try {
        data = JSON.parse(request.cookies.get("account")?.value || '{}');
      } catch (e) {
        data = null;
      }
    }

    // Step 2: Fallback — fetch from API only if cookie is missing/corrupt
    if (!data && token) {
      try {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${token}`);
        const response = await fetch(process.env.API_PROD_URL + selfData, {
          method: "GET",
          headers: myHeaders,
          redirect: "follow",
        });
        data = await response.json();
      } catch (e) {
        console.error("Middleware fetch error:", e);
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