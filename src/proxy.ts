import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 每個請求：更新登入 session 的 cookie，並加上含 nonce 的 Content-Security-Policy。
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseWs = supabaseUrl.replace(/^http/, "ws");
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${supabaseUrl} https://i.ytimg.com https://*.cloudflarestream.com https://videodelivery.net https://*.tile.openstreetmap.org`,
    `media-src 'self' blob: ${supabaseUrl}`,
    `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://upload.cloudflarestream.com https://*.cloudflarestream.com`,
    `frame-src https://www.youtube-nocookie.com https://*.cloudflarestream.com https://iframe.videodelivery.net https://challenges.cloudflare.com`,
    `font-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // 驗證並在需要時更新 token
  await supabase.auth.getUser();

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|api/webhooks).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
