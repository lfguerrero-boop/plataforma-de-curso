export const CATEGORIES = [
  { value: "seo", label: "SEO" },
  { value: "paid_ads", label: "Publicidad paga" },
  { value: "social_media", label: "Redes sociales" },
  { value: "email_marketing", label: "Email marketing" },
  { value: "analytics", label: "Analítica" },
] as const;

export const LEVELS = [
  { value: "basic", label: "Básico" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export type LevelValue = (typeof LEVELS)[number]["value"];
export type CourseStatus = "draft" | "published";

export const STATUS_LABEL: Record<CourseStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
};

export function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function levelLabel(value: string) {
  return LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function isCategory(value: string): value is CategoryValue {
  return CATEGORIES.some((c) => c.value === value);
}

export function isLevel(value: string): value is LevelValue {
  return LEVELS.some((l) => l.value === value);
}
