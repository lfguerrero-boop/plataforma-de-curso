"use client";

import { useEffect } from "react";

// Entrada escalonada de las secciones. Sin JS todo queda visible; con reduced-motion no hay viaje.
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll<HTMLVideoElement>("video[data-loop]").forEach((v) => {
      if (reduce) v.pause();
    });
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
    return () => {
      io.disconnect();
      root.classList.remove("js");
    };
  }, []);
  return null;
}
