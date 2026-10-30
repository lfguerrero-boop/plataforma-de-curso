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

const POSTERS = [
  { src: "/img/moulin-rouge.jpg", w: 900, h: 1268, alt: "Cartel de Toulouse-Lautrec para el Moulin Rouge: una bailarina y su pareja", cap: "Toulouse-Lautrec, 1891" },
  { src: "/img/stearns.jpg", w: 900, h: 1210, alt: "Cartel de bicicletas Stearns con una ciclista", cap: "Bicicletas Stearns, 1896" },
  { src: "/img/divan-japonais.jpg", w: 900, h: 1194, alt: "Cartel de Toulouse-Lautrec para el cabaré Divan Japonais", cap: "Toulouse-Lautrec, 1893" },
  { src: "/img/cycles-perfecta.jpg", w: 900, h: 1268, alt: "Cartel de Alphonse Mucha para las bicicletas Perfecta", cap: "Alphonse Mucha, 1902" },
];

export function Posters() {
  return (
    <section className="posters" aria-labelledby="carteles-titulo">
      <h2 id="carteles-titulo" className="sr-only">
        Un siglo de publicidad
      </h2>
      <div className="posters-grid">
        {POSTERS.map((p, i) => (
          <figure key={p.src} data-reveal style={{ "--i": i } as React.CSSProperties}>
            <Image src={p.src} width={p.w} height={p.h} alt={p.alt} unoptimized loading="lazy" />
          </figure>
        ))}
      </div>
      <div className="posters-row">
        <video
          className="clip"
          data-loop
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/img/anuncio-1956-poster.jpg"
          aria-label="Fragmento mudo de un anuncio de televisión de 1956: dos hombres conversan en un campo de béisbol"
        >
          <source src="/img/anuncio-1956.mp4" type="video/mp4" />
        </video>
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
          Carteles:{" "}
          <a href="https://commons.wikimedia.org/wiki/File:(Albi)_Moulin-rouge._La_Goulue_et_Valentin_le_desoss%C3%A9_-_Toulouse-Lautrec_1891_-_Inv.138.jpg">Moulin-rouge. La Goulue et Valentin le désossé</a>, Toulouse-Lautrec, 1891;{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Ride_a_Stearns_and_be_content,_bicycle_advertising_poster,_1896.jpg">Ride a Stearns and be content</a>, Edward Penfield, 1896;{" "}
          <a href="https://commons.wikimedia.org/wiki/File:(Albi)_Le_Divan_japonais_1893_lithographie_-_Toulouse-Lautrec_MTH.A3.jpg">Le Divan japonais</a>, Toulouse-Lautrec, 1893;{" "}
          <a href="https://commons.wikimedia.org/wiki/File:Alfons_Mucha_-_1902_-_Cycles_Perfecta.jpg">Cycles Perfecta</a>, Alphonse Mucha, 1902. Anuncio de televisión:{" "}
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
