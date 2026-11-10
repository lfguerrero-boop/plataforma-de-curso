// Convierte un texto en un embedding de 384 dimensiones (gte-small, el modelo que
// incluye el runtime de Supabase). No toca la base: quien llama guarda el vector con su
// propia sesión, así que RLS sigue decidiendo quién escribe en courses.embedding.

const session = new Supabase.ai.Session("gte-small");

const MAX_CHARS = 8000;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Método no permitido" }, { status: 405 });
  }

  let text: unknown;
  try {
    ({ text } = await req.json());
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim() || text.length > MAX_CHARS) {
    return Response.json(
      { error: `text debe ser un string de 1 a ${MAX_CHARS} caracteres` },
      { status: 400 },
    );
  }

  const embedding = await session.run(text, { mean_pool: true, normalize: true });
  return Response.json({ embedding });
});
