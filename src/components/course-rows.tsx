import Link from "next/link";
import { formatRatingShort, type CourseRating } from "@/lib/ratings";

export type CourseRowData = {
  id: string;
  title: string;
  description: string | null;
  meta: string;
  rating: CourseRating | null;
};

// Filas del catálogo: sin cajas; un punto, el nombre, una línea de detalle y el valor al extremo.
export function CourseRows({ rows }: { rows: CourseRowData[] }) {
  return (
    <ul id="catalogo">
      {rows.map((c, i) => (
        <li key={c.id} data-reveal style={{ "--i": i } as React.CSSProperties}>
          <span className="dot" aria-hidden="true" />
          <div className="row-main">
            <h3>
              <Link href={`/cursos/${c.id}`}>{c.title}</Link>
            </h3>
            <p>{c.meta}</p>
            {c.description && <p className="desc">{c.description}</p>}
          </div>
          <p
            data-calificacion={c.id}
            className={c.rating ? "row-value" : "row-value none"}
          >
            {formatRatingShort(c.rating)}
          </p>
        </li>
      ))}
    </ul>
  );
}
