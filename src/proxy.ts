import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas que exigen sesión. /instructor además exige rol instructor.
// Esto es solo comodidad de interfaz: la seguridad real la aplica RLS en la base.
const PROTECTED = ["/estado", "/mis-cursos", "/instructor"];

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida el token con el servidor de Auth y refresca la sesión si hace falta.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED.some((base) => matches(pathname, base));

  if (isProtected && !user) {
    return redirectTo(request, "/login", response);
  }

  if (user && matches(pathname, "/instructor")) {
    // El rol se lee de profiles (protegido por RLS), nunca de user_metadata,
    // que el propio usuario puede editar.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "instructor") {
      return redirectTo(request, "/", response);
    }
  }

  return response;
}

// Conserva las cookies de sesión refrescadas al redirigir.
function redirectTo(
  request: NextRequest,
  path: string,
  source: NextResponse,
) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
