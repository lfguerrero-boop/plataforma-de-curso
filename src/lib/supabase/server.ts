import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Siempre usa la clave publicable con la sesión del usuario, así RLS se aplica.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: no se pueden escribir cookies.
            // El refresco de sesión lo hará proxy.ts.
          }
        },
      },
    },
  );
}
