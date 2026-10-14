import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import "./print.css";

// Printable pages: no app chrome, white paper, signed-in users only (RLS limits the data).
export default async function PrintLayout({ children }: LayoutProps<"/print">) {
  if (!(await getViewer())) redirect("/login");
  return <div className="min-h-dvh bg-white text-black print:min-h-0">{children}</div>;
}
