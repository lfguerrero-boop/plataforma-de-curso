import { Suspense } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { requestPasswordReset } from "@/app/auth/actions";

type SearchParams = Promise<{ error?: string }>;

async function LinkError({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  if (error !== "enlace") return null;
  return (
    <p role="alert">El enlace no es válido o ya venció. Pide uno nuevo aquí abajo.</p>
  );
}

export default function RecuperarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="auth">
      <h1>Recuperar contraseña</h1>
      <p className="muted">
        Escribe el correo de tu cuenta, de estudiante o de instructor, y te enviamos un enlace para
        crear una contraseña nueva.
      </p>
      <div className="panel">
        <Suspense fallback={null}>
          <LinkError searchParams={searchParams} />
        </Suspense>
        <ActionForm action={requestPasswordReset} submitLabel="Enviar enlace">
          <label>
            Correo
            <input name="email" type="email" required autoComplete="email" />
          </label>
        </ActionForm>
      </div>
      <p className="auth-alt">
        ¿La recordaste? <Link href="/login">Inicia sesión</Link>
      </p>
    </main>
  );
}
