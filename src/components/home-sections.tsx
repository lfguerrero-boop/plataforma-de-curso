import Image from "next/image";
import Link from "next/link";

export function Hero() {
  return (
    <header className="hero">
      <h1 className="hero-word">
        Cursos<span className="sr-only"> de marketing digital</span>
      </h1>
      <div className="hero-copy">
        <p className="lead">
          Aprende marketing digital con instructores reales: SEO, anuncios,
          redes sociales, email y analítica.
        </p>
        <a className="btn" href="#catalogo-seccion">
          Ver el catálogo
        </a>
      </div>
    </header>
  );
}

// Los 4 servicios. Las imágenes son solo la ilustración (322x322): el título y la descripción van
// como texto real, no dentro de la imagen. El efecto WebGL las carga por su src y recorta como cover.
const SERVICES = [
  { src: "/img/servicio-embudo.webp", alt: "Un embudo de cristal con personas entrando y paneles de gráficos alrededor", title: "Funnels y dashboards", text: "Optimización inteligente" },
  { src: "/img/servicio-atencion.webp", alt: "Un robot sonriente con globos de chat y un mensaje 24/7", title: "Atención al cliente", text: "Soporte 24/7 sin límites" },
  { src: "/img/servicio-agentes.webp", alt: "Un robot humanoide señalando paneles de prospectos y ventas", title: "Agentes de venta IA", text: "Cierre de ventas automático" },
  { src: "/img/servicio-generativa.webp", alt: "Un rostro con un cerebro luminoso rodeado de pinceles, código y texto", title: "IA generativa", text: "Creatividad y contenido" },
];

export function Posters() {
  return (
    <section className="posters" aria-labelledby="ilustraciones-titulo">
      <h2 id="ilustraciones-titulo" className="sr-only">
        Servicios de marketing con inteligencia artificial
      </h2>
      <div className="posters-grid">
        {SERVICES.map((p, i) => (
          <figure key={p.src} data-reveal style={{ "--i": i } as React.CSSProperties}>
            <Image
              src={p.src}
              width={322}
              height={322}
              alt={p.alt}
              unoptimized
              // La primera ilustración es el LCP en móvil: sin lazy y con prioridad alta.
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
            <figcaption>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="posters-row">
        <video
          className="clip"
          data-loop
          data-src="/img/anuncio-1956.mp4"
          muted
          loop
          playsInline
          preload="none"
          poster="/img/anuncio-1956-poster.jpg"
          aria-label="Fragmento mudo de un anuncio de televisión de 1956: dos hombres conversan en un campo de béisbol"
        />

        <p className="posters-statement" data-reveal>
          La publicidad lleva un siglo persuadiendo. Lo nuevo es que ahora se
          mide. Aquí aprendes las dos cosas.
        </p>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="how" aria-labelledby="como-titulo">
      <div className="how-copy" data-reveal>
        <h2 id="como-titulo">Así se aprende aquí</h2>
        <p>Tú marcas el ritmo y la plataforma lleva la cuenta de tu avance.</p>
      </div>
      <div className="slip" data-reveal>
        <h3>Hoy</h3>
        <ul>
          <li data-reveal><span>Eliges un curso del catálogo</span><span className="leader" aria-hidden="true" /><span className="when">Explorar</span></li>
          <li><span>Te inscribes</span><span className="leader" aria-hidden="true" /><span className="when">1 clic</span></li>
        </ul>
        <h3>Cada día</h3>
        <ul>
          <li><span>Lees la lección y descargas sus recursos</span><span className="leader" aria-hidden="true" /><span className="when">A tu ritmo</span></li>
          <li><span>La marcas como completada</span><span className="leader" aria-hidden="true" /><span className="when">1 clic</span></li>
        </ul>
        <h3>Al terminar</h3>
        <ul>
          <li><span>Dejas tu reseña</span><span className="leader" aria-hidden="true" /><span className="when">De 1 a 5</span></li>
        </ul>
        <p className="total"><span>Tu progreso en el curso</span><span>100 %</span></p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="cta" aria-labelledby="cta-titulo">
      <h2 id="cta-titulo" className="cta-h">
        <span>Empieza</span>
        <span>hoy</span>
      </h2>
      <div className="cta-mid">
        <div className="cta-row" data-reveal>
          <Link href="/registro?role=student" className="btn">Soy estudiante</Link>
          <span className="or">o</span>
          <Link href="/registro?role=instructor" className="btn">Soy instructor</Link>
        </div>
        <p className="cta-note">Creas tu cuenta en un minuto y eliges tu rol.</p>
      </div>
    </section>
  );
}

export function HomeFooter() {
  return (
    <footer className="home-footer">
      <p className="footer-name" aria-hidden="true">
        Marketing Academy
      </p>
      <div className="footer-cols">
        <ul className="footer-places" data-reveal>
          <li><Link href="/">Catálogo</Link></li>
          <li><Link href="/login">Entrar</Link></li>
          <li><Link href="/registro">Crear cuenta</Link></li>
        </ul>
        <p className="footer-credits">
          Anuncio de televisión:{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Gillette_Super-Speed_TV_commercial_with_Pee_Wee_Reese_circa_1956.webm">Gillette Super-Speed TV commercial with Pee Wee Reese</a>, The Gillette Company, hacia 1956 (fragmento). Dominio público, vía Wikimedia Commons.
        </p>
      </div>
      <div className="footer-legal">
        <span>Plataforma de cursos de marketing digital · Proyecto de aprendizaje</span>
        <a href="#top">Volver arriba</a>
      </div>
    </footer>
  );
}
