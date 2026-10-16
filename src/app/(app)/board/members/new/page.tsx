import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { LEVELS } from "@/lib/permissions";
import { adminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RegisterMemberForm } from "./register-form";

export const metadata: Metadata = { title: "تسجيل عضو مجلس" };

export default async function RegisterMemberPage() {
  await requirePage("/board", LEVELS.edit);
  const supabase = await createClient();
  const { data: board } = await supabase.from("boards").select("id, name").eq("status", "active").order("term_start", { ascending: false }).limit(1).maybeSingle();
  if (!board) notFound();
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="تسجيل عضو" description={`عضو جديد في ${board.name}: بياناته، وسيرته الذاتية، وعضويته، وحساب دخوله.`} />
      <RegisterMemberForm boardId={board.id} accountsReady={adminConfigured()} />
    </>
  );
}
