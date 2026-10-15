// Shared by server and client components (kept out of "use client" files).

/** Who can own an item or receive a document request: "department:<id>" or "user:<id>". */
export type Target = { value: string; label: string; group: "department" | "user"; dept?: string };

/** Users grouped by the department they represent; people with no department last. */
export function byDepartment(targets: Target[]) {
  const groups = new Map<string, Target[]>();
  for (const t of targets.filter((t) => t.group === "user")) groups.set(t.dept ?? "", [...(groups.get(t.dept ?? "") ?? []), t]);
  return [...groups.entries()].sort(([a], [b]) => (a ? (b ? a.localeCompare(b, "ar") : -1) : 1));
}

export const ownerOf = (i: { owner_user_id?: string | null; department_id: string | null }) => (i.owner_user_id ? `user:${i.owner_user_id}` : i.department_id ? `department:${i.department_id}` : "");
