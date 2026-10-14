// Page permissions. A role grants each page one level; a user's level on a
// page is the highest level among their roles (computed by the database).

export const LEVELS = { none: 0, view: 1, edit: 2, manage: 3 } as const;
export type Level = (typeof LEVELS)[keyof typeof LEVELS];

export const LEVEL_LABELS: Record<Level, string> = {
  0: "بدون وصول",
  1: "عرض",
  2: "تعديل",
  3: "إدارة",
};

export type Permissions = ReadonlyMap<string, Level>;

export function toPermissions(rows: { page: string; level: number }[] | null): Permissions {
  return new Map((rows ?? []).map((row) => [row.page, clampLevel(row.level)]));
}

export function clampLevel(value: number): Level {
  return Math.max(0, Math.min(3, Math.trunc(value) || 0)) as Level;
}

export function levelFor(permissions: Permissions, page: string): Level {
  return permissions.get(page) ?? 0;
}

export function can(permissions: Permissions, page: string, level: Level = LEVELS.view): boolean {
  return levelFor(permissions, page) >= level;
}
