import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Destinos permitidos tras abrir el enlace del correo (evita redirecciones abiertas).
const ALLOWED_NEXT = ["/nueva-clave"];

// Supabase redirige aquí con ?code=…: se canjea por una sesión y se sigue a `next`.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requested = searchParams.get("next") ?? "";
  const next = ALLOWED_NEXT.includes(requested) ? requested : "/estado";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/recuperar?error=enlace`);
}
