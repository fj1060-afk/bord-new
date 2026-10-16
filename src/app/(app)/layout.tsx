import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const { data: committees } = can(viewer.permissions, "/committees")
    ? await (await createClient()).from("committees").select("id, name").eq("status", "active").order("name")
    : { data: [] };
  return (
    <AppShell viewer={viewer} committees={committees ?? []}>
      {children}
    </AppShell>
  );
}
