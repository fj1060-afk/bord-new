import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getViewer } from "@/lib/auth";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { OwnershipForm } from "./ownership-form";

export const metadata: Metadata = { title: "إشعار ملكية 5%" };

export default async function OwnershipPage({ params }: PageProps<"/people/[personId]/ownership">) {
  const viewer = await getViewer();
  if (!viewer) notFound();
  const { personId } = await params;
  const supabase = await createClient();
  const [{ data: person }, { data: contact }, profile] = await Promise.all([
    supabase.from("people").select("id, full_name, user_id").eq("id", personId).maybeSingle(),
    supabase.rpc("person_contact", { p_person: personId }).maybeSingle<{ email: string | null; phone: string | null }>(),
    companyProfile(supabase),
  ]);
  if (!person || (person.user_id !== viewer.id && !can(viewer.permissions, "/board", LEVELS.edit))) notFound();
  return (
    <>
      <PageHeader section={person.full_name} title="إشعار ملكية 5% أو تغيّرها" description="نموذج تداول لمن يملك أو له مصلحة في 5% أو أكثر من أسهم المصدر، أو تغيّرت مصلحته (قواعد طرح الأوراق المالية والالتزامات المستمرة م85). يُعبّأ هنا ثم يُطبع ويوقّع ويُرسل إلى تداول." />
      <OwnershipForm personId={personId} initial={{ name: person.full_name, issuer: profile?.name ?? "", phone: contact?.phone ?? "", email: contact?.email ?? "" }} />
    </>
  );
}
