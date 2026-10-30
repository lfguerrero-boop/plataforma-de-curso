import { CATEGORIES, LEVELS } from "@/lib/courses";

type Props = {
  course?: {
    title: string;
    description: string;
    category: string;
    level: string;
  };
};

export function CourseFields({ course }: Props) {
  return (
    <>
      <label>
        Título
        <input name="title" required defaultValue={course?.title} />
      </label>
      <label>
        Descripción
        <textarea
          name="description"
          rows={4}
          defaultValue={course?.description}
        />
      </label>
      <label>
        Categoría
        <select name="category" defaultValue={course?.category ?? "seo"}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nivel
        <select name="level" defaultValue={course?.level ?? "basic"}>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
