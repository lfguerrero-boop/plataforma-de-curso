import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export async function SiteNav() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return (
    <nav aria-label="Principal">
      <Link href="/" className="brand">
        Marketing Academy
      </Link>
      <Link href="/">Catálogo</Link>
      {role === "student" && <Link href="/mis-cursos">Mis cursos</Link>}
      {role === "instructor" && <Link href="/instructor">Panel del instructor</Link>}
      {user ? (
        <form action={signOut}>
          <button type="submit">Salir</button>
        </form>
      ) : (
        <>
          <Link href="/login">Entrar</Link>
          <Link href="/registro" className="nav-cta">
            Registrarse
          </Link>
        </>
      )}
    </nav>
  );
}
