import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="auth">
      <h1>Iniciar sesión</h1>
      <p className="muted">Entra para seguir aprendiendo o gestionar tus cursos.</p>
      <div className="panel">
        <LoginForm />
      </div>
      <p className="auth-alt">
        ¿No tienes cuenta? <Link href="/registro">Regístrate</Link>
      </p>
    </main>
  );
}
