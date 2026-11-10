"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const ROLES = ["student", "instructor"] as const;

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }
  if (!(ROLES as readonly string[]).includes(role)) {
    return { error: "Elige un rol válido: estudiante o instructor." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: fullName || null } },
  });

  if (error) return { error: error.message };

  // Con confirmación de correo activada no hay sesión hasta confirmar.
  if (!data.session) {
    return { message: "Cuenta creada. Revisa tu correo para confirmarla." };
  }
  redirect("/estado");
}

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/estado");
}

// Pide el correo de recuperación. La respuesta es la misma exista o no la cuenta,
// para no revelar qué correos están registrados.
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo." };

  const h = await headers();
  const origin = h.get("origin") ?? `http://${h.get("host")}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/nueva-clave`,
  });

  // Solo se muestran los errores que no dependen de la cuenta (límite de envíos, etc.).
  if (error && error.status === 429) {
    return { error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }
  return {
    message:
      "Si el correo está registrado, te enviamos un enlace para crear una contraseña nueva. Ábrelo en este mismo navegador.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "El enlace venció. Pide uno nuevo desde «Olvidé mi contraseña»." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/estado");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
