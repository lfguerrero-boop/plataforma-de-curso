// Solo lo que usa PostersGL. Con exportaciones con nombre el empaquetador puede descartar
// el resto de Three.js; `import("three")` completo arrastraba la biblioteca entera.
export {
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderer,
} from "three";
