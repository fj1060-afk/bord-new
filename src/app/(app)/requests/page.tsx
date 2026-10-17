import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { TabBar } from "@/components/ui/tab-bar";
import { buttonClass, compactInputClass, iconInputClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { byUrgency, portalEnabled, STAGES, tally, type Stage } from "@/lib/portal";
import { loadPortal } from "@/lib/portal-server";
import { createClient } from "@/lib/supabase/server";
import { RequestList } from "./_parts/request-list";

export const metadata: Metadata = { title: "الطلبات" };

const TABS: [Stage | "all", string][] = [["all", "الكل"], ...(Object.entries(STAGES) as [Stage, string][])];

/** Everything asked of the viewer or their departments, in one list: search, filters, and a tab per status. */
export default async function RequestsPage({ searchParams }: PageProps<"/requests">) {
  if (!portalEnabled()) notFound();
  const viewer = await requirePage("/my-tasks");
  const { tab = "all", q = "", meeting = "", dept = "" } = (await searchParams) as { tab?: string; q?: string; meeting?: string; dept?: string };
  const supabase = await createClient();
  const { rows, departments } = await loadPortal(supabase, viewer);

  const term = q.trim();
  const filtered = rows
    .filter((r) => (!meeting || r.meetingId === meeting) && (!dept || r.party === departments.find((d) => d.id === dept)?.name))
    .filter((r) => !term || `${r.title} ${r.context} ${r.meetingTitle ?? ""}`.includes(term));
  const counts = tally(filtered);
  const shown = (tab === "all" ? filtered : filtered.filter((r) => r.stage === tab)).sort(byUrgency);
  const meetings = [...new Map(rows.flatMap((r) => (r.meetingId ? [[r.meetingId, r.meetingTitle ?? ""] as const] : []))).entries()];
  const href = (t: string) => `/requests?${new URLSearchParams({ ...(t !== "all" && { tab: t }), ...(term && { q: term }), ...(meeting && { meeting }), ...(dept && { dept }) })}`;

  return (
    <>
      <PageHeader
        section="عام"
        title="الطلبات"
        description={departments.length ? `طلبات ${departments.map((d) => d.name).join(" و")} والمكلّف بها شخصياً` : "الطلبات المكلّف بها"}
        actions={
          departments.length > 0 ? (
            <Link href="/meetings/requests" className={buttonClass("primary", "min-h-11")}>
              <Plus size={16} aria-hidden="true" /> طلب إضافة بند
            </Link>
          ) : undefined
        }
      />

      <TabBar id="requests-tabs" label="حالة الطلبات" tone="primary" className="mb-4 flex overflow-x-auto border-b border-rule text-sm">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={href(key)}
            aria-current={tab === key ? "page" : undefined}
            className={clsx("motion-colors inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-t-md px-3", tab === key ? "bg-primary-soft font-bold text-primary" : "text-ink-muted hover:text-ink")}
          >
            {label} <span className="font-mono text-xs">({counts[key]})</span>
          </Link>
        ))}
      </TabBar>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">بحث</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-muted" />
          <input name="q" type="search" defaultValue={term} placeholder="ابحث في الطلبات" className={iconInputClass} />
        </label>
        {meetings.length > 1 && (
          <select name="meeting" defaultValue={meeting} aria-label="الاجتماع" className={compactInputClass}>
            <option value="">جميع الاجتماعات</option>
            {meetings.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        )}
        {departments.length > 1 && (
          <select name="dept" defaultValue={dept} aria-label="الإدارة" className={compactInputClass}>
            <option value="">جميع الإدارات</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
        <button className={buttonClass("secondary", "min-h-11")}>بحث</button>
      </form>

      {counts.late > 0 && (
        <p className="mb-3 text-xs text-danger">
          {counts.late === 1 ? "طلب واحد متأخر" : `${counts.late} طلبات متأخرة`} عن موعده النهائي.
        </p>
      )}
      <RequestList rows={shown} empty={rows.length ? "لا طلبات مطابقة." : "لا توجد طلبات عليك أو على إدارتك حالياً."} />
    </>
  );
}
