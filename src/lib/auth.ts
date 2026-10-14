import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { can, LEVELS, type Level, type Permissions, toPermissions } from "./permissions";
import { createClient } from "./supabase/server";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  permissions: Permissions;
};

/** The signed-in, active user with their page permissions, or null. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("email, full_name, status").eq("id", userId).single(),
    supabase.rpc("my_permissions"),
  ]);
  if (!profile || profile.status !== "active") return null;

  return {
    id: userId,
    email: profile.email,
    fullName: profile.full_name,
    permissions: toPermissions(rows),
  };
});

/** Guards a page: sends signed-out users to login and hides pages the user cannot open. */
export async function requirePage(page: string, level: Level = LEVELS.view): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!can(viewer.permissions, page, level)) notFound();
  return viewer;
}
