import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/supabase/env";

const MISSING_ENV_PAGE = `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>الإعداد غير مكتمل</title>
<body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.8">
<h1>الإعداد غير مكتمل</h1>
<p>متغيرات Supabase غير موجودة في هذا النشر. أضف <code>NEXT_PUBLIC_SUPABASE_URL</code>
و<code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> في إعدادات Vercel، ثم أعد النشر (Redeploy).</p>
</body></html>`;

const PUBLIC_PATHS = ["/login", "/forgot-password", "/auth/"];

// Refreshes the Supabase session cookie on every request and sends
// signed-out visitors to the login page.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let env: ReturnType<typeof supabaseEnv>;
  try {
    env = supabaseEnv();
  } catch {
    return new NextResponse(MISSING_ENV_PAGE, {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const { url, publishableKey } = env;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p));

  if (!data?.claims && !isPublic) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
