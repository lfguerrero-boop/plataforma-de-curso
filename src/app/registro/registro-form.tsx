"use client";

import { useActionState } from "react";
import { signUp, type AuthState } from "@/app/auth/actions";

const initial: AuthState = {};

export function RegistroForm({ defaultRole = "student" }: { defaultRole?: "student" | "instructor" }) {
  const [state, action, pending] = useActionState(signUp, initial);

  return (
    <form action={action}>
      <label>
        Nombre
        <input name="full_name" type="text" autoComplete="name" />
      </label>
      <label>
        Correo
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </label>
      <label>
        Soy
        <select name="role" defaultValue={defaultRole} required>
          <option value="student">Estudiante</option>
          <option value="instructor">Instructor</option>
        </select>
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
