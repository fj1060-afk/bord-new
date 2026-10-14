import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";
import { CalendarTab, DeadlinesTab } from "./_calendar";
import { ReportsTab, WorkTab } from "./_work";

export const metadata: Metadata = { title: "مكتب الحوكمة" };

const TABS = { work: "مركز العمل", calendar: "التقويم", deadlines: "المواعيد النهائية", reports: "التقارير" } as const;

export default async function GovernanceOfficePage({ searchParams }: PageProps<"/governance-office">) {
  await requirePage("/governance-office");
  const params = (await searchParams) as Record<string, string | undefined>;
  const tab = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "work";
  const supabase = await createClient();
  const today = riyadhToday();

  return (
    <>
      <PageHeader section="المكاتب" title="مكتب الحوكمة" description="ما ينتظر المعالجة، والتقويم، والمواعيد النهائية، وتقارير الأداء." />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm" aria-label="أقسام مكتب الحوكمة">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/governance-office?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("shrink-0 border-b-2 px-4 py-2.5", tab === key ? "border-brass font-medium" : "border-transparent text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "work" && <WorkTab supabase={supabase} today={today} />}
      {tab === "calendar" && <CalendarTab supabase={supabase} today={today} month={params.m} />}
      {tab === "deadlines" && <DeadlinesTab supabase={supabase} today={today} />}
      {tab === "reports" && <ReportsTab supabase={supabase} today={today} year={Number(params.year) || Number(today.slice(0, 4))} />}
    </>
  );
}
