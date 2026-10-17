import type { Metadata } from "next";
import Link from "next/link";
import { TabBar } from "@/components/ui/tab-bar";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { profileWarnings } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm, type ProfileSection } from "./company-form";
import { PowersForm } from "./powers-form";
import { GovernanceTexts, type ArticleRow } from "./governance-texts";
import type { GovernanceText } from "./governance-form";
import { riyadhToday } from "@/lib/minutes";

export const metadata: Metadata = { title: "ملف الشركة" };

const TABS = {
  company: "الشركة",
  rules: "أحكام النظام الأساس",
  powers: "الصلاحيات والتفويضات",
  secretary: "أمين السر",
  texts: "النظام الأساس واللوائح",
} as const;
type Tab = keyof typeof TABS;

export default async function CompanyPage({ searchParams }: PageProps<"/admin/company">) {
  const viewer = await requirePage("/admin/company");
  const { tab: raw } = (await searchParams) as { tab?: string };
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "company";
  const canEdit = can(viewer.permissions, "/admin/company", LEVELS.edit);
  const supabase = await createClient();
  const profile = await companyProfile(supabase);
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
      <TabBar id="company-tabs" label="أقسام ملف الشركة" className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/admin/company?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("motion-colors shrink-0 px-4 py-2.5", tab === key ? "font-medium text-ink" : "text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </TabBar>
      {/* Each tab's content enters on its own when the tab changes. */}
      <div key={tab} className="page-in">

        {(tab === "company" || tab === "rules" || tab === "secretary") && <ProfileTab show={tab} profile={profile} canEdit={canEdit} />}
        {tab === "powers" && <PowersTab restricted={(profile as { bylaws_restrictions?: string[] }).bylaws_restrictions ?? []} canEdit={canEdit} />}
        {tab === "texts" && <TextsTab canEdit={canEdit} />}
      </div>
    </>
  );
}

async function ProfileTab({ show, profile, canEdit }: { show: ProfileSection; profile: NonNullable<Awaited<ReturnType<typeof companyProfile>>>; canEdit: boolean }) {
  const supabase = await createClient();
  const { data: people } = await supabase.from("people").select("id, full_name").order("full_name");
  return <CompanyForm profile={profile} people={people ?? []} canEdit={canEdit} show={show} />;
}

async function PowersTab({ restricted, canEdit }: { restricted: string[]; canEdit: boolean }) {
  const supabase = await createClient();
  const { data: grants } = await supabase.from("ga_authorizations").select("id, kind, granted_on, expires_on, assembly_reference").order("granted_on", { ascending: false });
  return <PowersForm restricted={restricted} grants={(grants ?? []) as never} today={riyadhToday()} canEdit={canEdit} />;
}

async function TextsTab({ canEdit }: { canEdit: boolean }) {
  const supabase = await createClient();
  const [{ data: texts }, { data: articles }] = await Promise.all([
    supabase.from("governance_texts").select("id, kind, title, version, approved_on, approved_by, library_document_id, status, source_text").order("created_at"),
    supabase.from("governance_articles").select("text_id, position, number, heading, chapter, body").order("position"),
  ]);
  return <GovernanceTexts texts={(texts ?? []) as GovernanceText[]} articles={(articles ?? []) as ArticleRow[]} canEdit={canEdit} />;
}
