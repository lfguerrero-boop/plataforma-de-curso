import type { Metadata } from "next";
import { Suspense } from "react";
import { Chivo } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

const chivo = Chivo({
  variable: "--font-chivo",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Cursos de marketing digital",
  description: "Plataforma de cursos de marketing digital para instructores y estudiantes",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={chivo.variable}>
      <body>
        <Suspense fallback={<nav aria-label="Principal" />}>
          <SiteNav />
        </Suspense>
        {children}
        <footer className="site-footer">
          Plataforma de cursos de marketing digital · Proyecto de aprendizaje
        </footer>
      </body>
    </html>
  );
}
