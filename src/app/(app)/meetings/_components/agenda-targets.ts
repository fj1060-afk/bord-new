// Shared by server and client components (kept out of "use client" files).

/** Who can own an item or receive a document request: "department:<id>" or "user:<id>". */
export type Target = { value: string; label: string; group: "department" | "user" };

export const ownerOf = (i: { owner_user_id?: string | null; department_id: string | null }) => (i.owner_user_id ? `user:${i.owner_user_id}` : i.department_id ? `department:${i.department_id}` : "");
