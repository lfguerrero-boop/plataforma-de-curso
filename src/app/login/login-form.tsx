"use client";

import { useActionState } from "react";
import { signIn, type AuthState } from "@/app/auth/actions";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);

  return (
    <form action={action}>
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
          autoComplete="current-password"
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  );
}
