import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { profileWarnings } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "./company-form";
import { PowersForm } from "./powers-form";
import { riyadhToday } from "@/lib/minutes";

export const metadata: Metadata = { title: "ملف الشركة" };

export default async function CompanyPage() {
  const viewer = await requirePage("/admin/company");
  const supabase = await createClient();
  const [profile, { data: people }, { data: grants }] = await Promise.all([
    companyProfile(supabase),
    supabase.from("people").select("id, full_name").order("full_name"),
    supabase.from("ga_authorizations").select("id, kind, granted_on, expires_on, assembly_reference").order("granted_on", { ascending: false }),
  ]);
  if (!profile) throw new Error("company_profile row is missing");
  const warnings = profileWarnings(profile);

  return (
    <>
      <PageHeader section="الإدارة" title="ملف الشركة" description="نوع الشركة وأحكام نظامها الأساس. يطبّقها النظام في النصاب والإنابة ومدة الدورة، وتعتمد عليها قواعد الامتثال." />
      {warnings.length > 0 && (
        <ul role="alert" className="mb-6 flex flex-col gap-1 rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <CompanyForm profile={profile} people={people ?? []} canEdit={can(viewer.permissions, "/admin/company", LEVELS.edit)} />
      <PowersForm
        restricted={(profile as { bylaws_restrictions?: string[] }).bylaws_restrictions ?? []}
        grants={(grants ?? []) as never}
        today={riyadhToday()}
        canEdit={can(viewer.permissions, "/admin/company", LEVELS.edit)}
      />
    </>
  );
}
