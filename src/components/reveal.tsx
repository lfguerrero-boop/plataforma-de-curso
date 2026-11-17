"use client";

import { useEffect } from "react";

// Entrada escalonada de las secciones. Sin JS todo queda visible; con reduced-motion no hay viaje.
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // El video no se descarga hasta estar cerca de la pantalla; con reduced-motion se queda
    // el póster. Sin JavaScript también se queda el póster.
    const clips = Array.from(document.querySelectorAll<HTMLVideoElement>("video[data-src]"));
    let clipIo: IntersectionObserver | undefined;
    if (!reduce && clips.length && "IntersectionObserver" in window) {
      clipIo = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const v = e.target as HTMLVideoElement;
            clipIo?.unobserve(v);
            v.src = v.dataset.src!;
            void v.play().catch(() => {});
          }
        },
        { rootMargin: "200px" },
      );
      clips.forEach((v) => clipIo!.observe(v));
    }
    if (reduce || !("IntersectionObserver" in window)) return;
    root.classList.add("js");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    // Lo que llega después por streaming (resultados de búsqueda, catálogo lento) también
    // debe revelarse: sin esto quedaría con opacity 0 para siempre.
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.hasAttribute("data-reveal")) io.observe(node);
          node.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      clipIo?.disconnect();
      mo.disconnect();
      io.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}
