"use client";

import { useEffect } from "react";
import type * as ThreeNS from "three";

// Los carteles de la portada dibujados en WebGL, sincronizados con las <img> del HTML:
// se doblan con la velocidad del scroll, se inclinan hacia el cursor y se revelan con un barrido.
// Mejora progresiva: sin WebGL o con reduced-motion no se hace nada y queda el HTML.
const VERT = /* glsl */ `
  uniform float uVel;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(uv.y * 3.14159) * uVel * 150.0;
    p.x += (uv.y - 0.5) * uVel * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uPlane;
  uniform vec2 uImg;
  uniform float uVel;
  uniform float uReveal;
  varying vec2 vUv;
  void main() {
    // object-fit: cover
    vec2 uv = vUv - 0.5;
    float pa = uPlane.x / uPlane.y;
    float ia = uImg.x / uImg.y;
    if (pa > ia) uv.y *= ia / pa; else uv.x *= pa / ia;
    uv += 0.5;
    float r = abs(uVel) * 0.01;
    vec3 c = vec3(
      texture2D(uTex, uv + vec2(r, 0.0)).r,
      texture2D(uTex, uv).g,
      texture2D(uTex, uv - vec2(r, 0.0)).b
    );
    // barrido de arriba hacia abajo
    float m = 1.0 - step(uReveal * 1.02, 1.0 - vUv.y);
    if (m < 0.5) discard;
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

type Item = {
  img: HTMLImageElement;
  mesh: ThreeNS.Mesh<ThreeNS.PlaneGeometry, ThreeNS.ShaderMaterial>;
  hover: number;
  reveal: number;
  seen: boolean;
  ready: boolean;
};

export function PostersGL() {
  useEffect(() => {
    const section = document.querySelector<HTMLElement>(".posters");
    const grid = document.querySelector<HTMLElement>(".posters-grid");
    const figures = Array.from(
      document.querySelectorAll<HTMLElement>(".posters-grid figure"),
    );
    if (!section || !grid || !figures.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let dispose: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      let THREE: typeof ThreeNS;
      try {
        THREE = await import("three");
      } catch {
        return;
      }
      if (cancelled) return;

      let renderer: ThreeNS.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        return; // sin WebGL: queda el HTML
      }

      const canvas = renderer.domElement;
      canvas.className = "posters-gl";
      canvas.setAttribute("aria-hidden", "true");
      grid.appendChild(canvas); // solo cubre los carteles, nunca el texto de debajo
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 10, 5000);
      const loader = new THREE.TextureLoader();
      const geometry = new THREE.PlaneGeometry(1, 1, 20, 28);

      const items: Item[] = figures.map((fig) => {
        const img = fig.querySelector("img") as HTMLImageElement;
        const material = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            uTex: { value: null },
            uPlane: { value: new THREE.Vector2(3, 4) },
            uImg: { value: new THREE.Vector2(3, 4) },
            uVel: { value: 0 },
            uReveal: { value: 0 },
          },
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.visible = false;
        scene.add(mesh);
        const item: Item = { img, mesh, hover: 0, reveal: 0, seen: false, ready: false };
        loader.load(img.currentSrc || img.src, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          material.uniforms.uTex.value = tex;
          material.uniforms.uImg.value.set(tex.image.width, tex.image.height);
          item.ready = true;
          section.classList.add("gl-ready"); // oculta las <img> (siguen ocupando su sitio)
        });
        return item;
      });

      const PAD = 90; // margen extra arriba y abajo para el desplazamiento y la curvatura
      let w = 0;
      let h = 0;
      const resize = () => {
        const r = grid.getBoundingClientRect();
        w = r.width;
        h = r.height + PAD * 2;
        canvas.style.top = `-${PAD}px`;
        renderer.setSize(w, h, false);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        camera.aspect = w / h;
        // a z = dist el plano mide exactamente h píxeles de alto: 1 unidad = 1 px
        const dist = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(0, 0, dist);
        camera.far = dist * 4;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(grid);

      const pointer = { x: -9999, y: -9999 };
      const onMove = (e: PointerEvent) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      };
      const onLeave = () => {
        pointer.x = pointer.y = -9999;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);

      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
        rootMargin: "100px",
      });
      io.observe(section);

      let lastY = window.scrollY;
      let vel = 0;
      let raf = 0;
      let last = performance.now();
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (!visible) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        const y = window.scrollY;
        const target = Math.max(-1, Math.min(1, (y - lastY) / Math.max(dt, 0.001) / 2600));
        lastY = y;
        vel += (target - vel) * Math.min(1, dt * 8);

        const s = grid.getBoundingClientRect();
        for (const it of items) {
          if (!it.ready) continue;
          const r = it.img.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          if (!it.seen && r.top < window.innerHeight * 0.92 && r.bottom > 0) it.seen = true;
          it.reveal += ((it.seen ? 1 : 0) - it.reveal) * Math.min(1, dt * 2.6);

          const dx = pointer.x - cx;
          const dy = pointer.y - cy;
          const inside = Math.abs(dx) < r.width / 2 && Math.abs(dy) < r.height / 2;
          it.hover += ((inside ? 1 : 0) - it.hover) * Math.min(1, dt * 7);

          const m = it.mesh;
          m.visible = it.reveal > 0.001;
          m.position.set(cx - s.left - w / 2, -(cy - (s.top - PAD) - h / 2), it.hover * 40);
          m.scale.set(r.width, r.height, 1);
          m.rotation.y = (dx / r.width) * 0.5 * it.hover;
          m.rotation.x = (dy / r.height) * 0.4 * it.hover;
          const u = m.material.uniforms;
          u.uPlane.value.set(r.width, r.height);
          u.uVel.value = vel;
          u.uReveal.value = it.reveal;
        }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);

      dispose = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        window.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerleave", onLeave);
        for (const it of items) {
          it.mesh.material.uniforms.uTex.value?.dispose();
          it.mesh.material.dispose();
        }
        geometry.dispose();
        renderer.dispose();
        canvas.remove();
        section.classList.remove("gl-ready");
      };
    };

    // Solo se descarga Three.js cuando los carteles están cerca de la pantalla.
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(section);

    return () => {
      cancelled = true;
      io.disconnect();
      dispose?.();
    };
  }, []);

  return null;
}
