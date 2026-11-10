import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { updatePassword } from "@/app/auth/actions";

export default function NuevaClavePage() {
  return (
    <main className="auth">
      <h1>Crea tu contraseña nueva</h1>
      <p className="muted">Elige una contraseña de al menos 6 caracteres.</p>
      <div className="panel">
        <ActionForm action={updatePassword} submitLabel="Guardar contraseña">
          <label>
            Contraseña nueva
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label>
            Repite la contraseña
            <input
              name="confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
        </ActionForm>
      </div>
      <p className="auth-alt">
        ¿El enlace venció? <Link href="/recuperar">Pide uno nuevo</Link>
      </p>
    </main>
  );
}
