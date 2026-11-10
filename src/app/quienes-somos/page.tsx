import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CATEGORIES, LEVELS } from "@/lib/courses";
import { FeaturedCourses } from "@/components/featured-courses";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Quiénes somos · Marketing Academy",
  description:
    "Marketing Academy es una plataforma de cursos de marketing digital para instructores y estudiantes.",
};

export default function QuienesSomosPage() {
  return (
    <main className="page about">
      <Reveal />
      <header className="page-head">
        <h1>Quiénes somos</h1>
        <p>
          Marketing Academy es una plataforma de cursos de marketing digital donde los
          instructores publican lo que saben y los estudiantes aprenden a su ritmo.
        </p>
      </header>

      <section>
        <h2>Qué enseñamos</h2>
        <p>
          Los cursos se agrupan en {CATEGORIES.length} áreas:{" "}
          {CATEGORIES.map((c) => c.label).join(", ")}. Cada curso tiene un nivel (
          {LEVELS.map((l) => l.label.toLowerCase()).join(", ")}) para que sepas por dónde
          empezar.
        </p>
      </section>

      <section>
        <h2>Cómo funciona</h2>
        <p>
          Al registrarte eliges ser instructor o estudiante. Los instructores crean sus cursos
          en borrador y los publican cuando tienen al menos una lección. Cualquiera puede ver
          el temario de un curso publicado; el contenido de las lecciones es para quienes se
          inscriben. Después de cursar puedes dejar tu reseña y ayudar a otros a elegir.
        </p>
      </section>

      <section>
        <h2>Cursos recientes</h2>
        <Suspense fallback={<p className="muted">Cargando cursos…</p>}>
          <FeaturedCourses />
        </Suspense>
        <p className="about-cta">
          <Link href="/" className="btn">
            Ver todo el catálogo
          </Link>
        </p>
      </section>
    </main>
  );
}
