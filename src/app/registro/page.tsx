import { Suspense } from "react";
import Link from "next/link";
import { RegistroForm } from "./registro-form";

type SearchParams = Promise<{ role?: string }>;

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { role } = await searchParams;
  return <RegistroForm defaultRole={role === "instructor" ? "instructor" : "student"} />;
}

export default function RegistroPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="auth">
      <h1>Crear cuenta</h1>
      <p className="muted">Elige si quieres aprender o enseñar.</p>
      <div className="panel">
        <Suspense fallback={null}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="auth-alt">
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </main>
  );
}
