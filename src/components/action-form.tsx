"use client";

import { useActionState, type ReactNode } from "react";

export type FormState = { error?: string; message?: string };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children?: ReactNode;
};

// Formulario que muestra el error o mensaje que devuelva la Server Action.
export function ActionForm({ action, submitLabel, children }: Props) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction}>
      {children}
      <button type="submit" disabled={pending}>
        {pending ? "Guardando…" : submitLabel}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
