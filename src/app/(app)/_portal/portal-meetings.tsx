import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, ChevronLeft } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PageHeader } from "@/components/ui/page-header";
import { TabBar } from "@/components/ui/tab-bar";
import { buttonClass } from "@/components/ui/styles";
import { formatDateTime } from "@/lib/format";
import { MEETING_MODES, MEETING_STATUS } from "@/lib/meetings";

/**
 * The meetings a department user may see (RLS: invited, or asked for documents), upcoming or past.
 * Each opens the user's own requests for it, not the meeting's full agenda.
 */
export async function PortalMeetings({ supabase, period }: { supabase: SupabaseClient; period: string }) {
  const now = new Date().toISOString();
  const { data } = await supabase.from("meetings").select("id, title, starts_at, mode, status, duration_minutes").neq("status", "cancelled").order("starts_at");
  const all = data ?? [];
  const upcoming = all.filter((m) => m.starts_at >= now);
  const past = all.filter((m) => m.starts_at < now).reverse();
  const past_ = period === "past";
  const shown = past_ ? past : upcoming;

  return (
    <>
      <PageHeader section="عام" title="الاجتماعات" description="الاجتماعات المصرّح لك بالاطلاع عليها فقط." />
      <TabBar id="portal-meetings" label="الفترة" tone="primary" className="mb-4 flex border-b border-rule text-sm">
        {[
          ["upcoming", `القادمة (${upcoming.length})`],
          ["past", `السابقة (${past.length})`],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={key === "past" ? "/meetings?period=past" : "/meetings"}
            aria-current={(key === "past") === past_ ? "page" : undefined}
            className={clsx("motion-colors inline-flex min-h-11 flex-1 items-center justify-center rounded-t-md px-4 sm:flex-none", (key === "past") === past_ ? "bg-primary-soft font-bold text-primary" : "text-ink-muted hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </TabBar>
      {shown.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">{past_ ? "لا اجتماعات سابقة." : "لا اجتماعات قادمة."}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-rule bg-surface p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 basis-48">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.title}</span>
                  <span className="rounded-full border border-rule px-2 py-0.5 text-xs text-ink-muted">{MEETING_STATUS[m.status as keyof typeof MEETING_STATUS]}</span>
                </span>
                <span className="block text-xs text-ink-muted">
                  {formatDateTime(new Date(m.starts_at))} · {MEETING_MODES[m.mode as keyof typeof MEETING_MODES]} · {m.duration_minutes} دقيقة
                </span>
              </span>
              <Link href={`/requests?meeting=${m.id}`} className={buttonClass("secondary", "min-h-11")}>
                طلباتك لهذا الاجتماع <ChevronLeft size={15} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
