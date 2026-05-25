import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = ['id', 'en'];
const DEFAULT_LOCALE = 'id';

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && LOCALES.includes(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl?.pathname ?? '';

  // Check if path already has locale prefix
  const pathnameHasLocale = LOCALES.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Extract locale and actual path
  const locale = LOCALES.find((l) => pathname.startsWith(`/${l}`)) ?? DEFAULT_LOCALE;
  const strippedPath = pathname.slice(`/${locale}`.length) || '/';

  const protectedPaths = ['/dashboard'];
  const authPaths = ['/auth/login', '/auth/register'];

  const isProtected = protectedPaths.some((p) => strippedPath.startsWith(p));
  const isAuthPath = authPaths.some((p) => strippedPath.startsWith(p));

  // Create response early so we can set cookies on it
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (isProtected || isAuthPath) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Update request cookies for downstream server components
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            // Re-create response with updated request headers
            response = NextResponse.next({
              request: { headers: request.headers },
            });
            // Set cookies on the response so browser receives refreshed tokens
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (isProtected && !user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/auth/login`;
      return NextResponse.redirect(url);
    }
    if (isAuthPath && user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
