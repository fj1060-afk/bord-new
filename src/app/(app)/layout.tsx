import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getViewer } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return <AppShell viewer={viewer}>{children}</AppShell>;
}
