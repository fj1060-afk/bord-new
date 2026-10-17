import type { Metadata } from "next";
import Link from "next/link";
import { TabBar } from "@/components/ui/tab-bar";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";
import { CalendarTab, DeadlinesTab } from "./_calendar";
import { ComplianceTab } from "./_compliance";
import { ReportsTab, WorkTab } from "./_work";

export const metadata: Metadata = { title: "مكتب الحوكمة" };

const TABS = { compliance: "الامتثال", work: "مركز العمل", calendar: "التقويم", deadlines: "المواعيد النهائية", reports: "التقارير" } as const;

export default async function GovernanceOfficePage({ searchParams }: PageProps<"/governance-office">) {
  await requirePage("/governance-office");
  const params = (await searchParams) as Record<string, string | undefined>;
  const tab = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "compliance";
  const supabase = await createClient();
  const today = riyadhToday();

  return (
    <>
      <PageHeader section="المكاتب" title="مكتب الحوكمة" description="الامتثال للأنظمة، وما ينتظر المعالجة، والتقويم، والمواعيد النهائية، وتقارير الأداء." />
      <TabBar id="governance-tabs" label="أقسام مكتب الحوكمة" className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/governance-office?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("motion-colors shrink-0 px-4 py-2.5", tab === key ? "font-medium text-ink" : "text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </TabBar>
      {/* Each tab's content enters on its own when the tab changes. */}
      <div key={tab} className="page-in">
        {tab === "compliance" && <ComplianceTab supabase={supabase} />}
        {tab === "work" && <WorkTab supabase={supabase} today={today} />}
        {tab === "calendar" && <CalendarTab supabase={supabase} today={today} month={params.m} />}
        {tab === "deadlines" && <DeadlinesTab supabase={supabase} today={today} />}
        {tab === "reports" && <ReportsTab supabase={supabase} today={today} year={Number(params.year) || Number(today.slice(0, 4))} />}
      </div>
    </>
  );
}
