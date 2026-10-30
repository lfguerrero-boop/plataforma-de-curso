"use server";

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
