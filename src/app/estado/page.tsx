import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

async function Estado() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return <p id="estado">Sin sesión</p>;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  return (
    <>
      <p id="estado">
        Sesión de {data.user.email} · rol {profile?.role ?? "desconocido"}
      </p>
      <form action={signOut}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </>
  );
}

export default function EstadoPage() {
  return (
    <main className="page">
      <h1>Estado de la sesión</h1>
      <Suspense fallback={<p>Cargando…</p>}>
        <Estado />
      </Suspense>
    </main>
  );
}
