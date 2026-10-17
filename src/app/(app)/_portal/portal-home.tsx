import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, Clock, Inbox, Paperclip, type LucideIcon } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Viewer } from "@/lib/auth";
import { formatDateTime, formatGregorianDate } from "@/lib/format";
import { MEETING_MODES } from "@/lib/meetings";
import { byUrgency, needsAction, tally } from "@/lib/portal";
import { loadPortal } from "@/lib/portal-server";
import { LateBadge, RequestList, StagePill } from "../requests/_parts/request-list";

const day = (d: string) => formatGregorianDate(new Date(`${d}T12:00:00+03:00`)).replace(/^[^،]+،\s*/, "");

/** A department user's home: counts, what needs action, the nearest deadline, upcoming meetings and recent uploads. */
export async function PortalHome({ supabase, viewer, greeting }: { supabase: SupabaseClient; viewer: Viewer; greeting: string }) {
  const [{ rows, departments }, { data: meetings }, { data: uploads }] = await Promise.all([
    loadPortal(supabase, viewer),
    // RLS lists only the meetings this user is invited to or contributes to.
    supabase.from("meetings").select("id, title, starts_at, mode").neq("status", "cancelled").gte("starts_at", new Date().toISOString()).order("starts_at").limit(3),
    supabase.from("meeting_documents").select("id, title, created_at, document_request_id").not("document_request_id", "is", null).order("created_at", { ascending: false }).limit(5),
  ]);
  const counts = tally(rows);
  const open = rows.filter((r) => needsAction(r.stage)).sort(byUrgency);
  const nearest = open.filter((r) => r.due).sort((a, b) => a.due!.localeCompare(b.due!))[0];
  const tiles: [string, number, LucideIcon, string, string][] = [
    ["جديدة", counts.new, Inbox, "text-primary", "/requests?tab=new"],
    ["قيد التنفيذ", counts.in_progress, Clock, "text-brass", "/requests?tab=in_progress"],
    ["متأخرة", counts.late, AlertTriangle, "text-danger", "/requests"],
    ["مكتملة", counts.done, CheckCircle2, "text-primary", "/requests?tab=done"],
  ];

  return (
    <>
      <header className="mb-6 border-b border-rule pb-4">
        {departments.length > 0 && <p className="text-sm text-brass">{departments.map((d) => d.name).join(" · ")}</p>}
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          {greeting}، {viewer.fullName || "مرحباً"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">إليك نظرة سريعة على الطلبات والاجتماعات.</p>
      </header>

      <ul className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([label, value, Icon, tone, href]) => (
          <li key={label}>
            <Link href={href} className={clsx("motion-colors flex h-full items-center justify-between gap-3 rounded-lg border bg-surface p-4 hover:border-primary", label === "متأخرة" && value ? "border-danger/50" : "border-rule")}>
              <span>
                <span className="block text-sm text-ink-muted">{label}</span>
                <span className={clsx("font-mono text-3xl font-bold", value ? tone : "text-ink-muted")}>{value}</span>
              </span>
              <Icon size={26} aria-hidden="true" className={clsx("shrink-0", value ? tone : "text-ink-muted")} />
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">طلبات تحتاج إجراء ({open.length})</h2>
            <Link href="/requests" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              عرض جميع الطلبات <ChevronLeft size={15} aria-hidden="true" />
            </Link>
          </div>
          <RequestList rows={open.slice(0, 5)} empty="لا شيء عليك الآن." />
        </section>

        <aside className="flex flex-col gap-4">
          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="mb-2 inline-flex items-center gap-2 font-display text-base font-bold">
              <CalendarClock size={17} aria-hidden="true" className="text-brass" /> أقرب موعد تسليم
            </h2>
            {nearest ? (
              <Link href={nearest.href} className="flex flex-col gap-1.5 rounded-md bg-paper p-3 hover:bg-primary-soft">
                <span className="font-medium">{nearest.title}</span>
                <span className="text-xs text-ink-muted">{nearest.context}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <StagePill stage={nearest.stage} />
                  {nearest.late && <LateBadge />}
                  <span className={nearest.late ? "text-danger" : "text-ink-muted"}>{day(nearest.due!)}</span>
                </span>
              </Link>
            ) : (
              <p className="text-sm text-ink-muted">لا مواعيد قريبة.</p>
            )}
          </section>

          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="mb-2 inline-flex items-center gap-2 font-display text-base font-bold">
              <CalendarDays size={17} aria-hidden="true" className="text-brass" /> الاجتماعات القادمة
            </h2>
            {(meetings ?? []).length ? (
              <ul className="flex flex-col divide-y divide-rule">
                {(meetings ?? []).map((m) => (
                  <li key={m.id} className="py-2">
                    <Link href={`/meetings/${m.id}`} className="block hover:text-primary">
                      <span className="block text-sm font-medium">{m.title}</span>
                      <span className="text-xs text-ink-muted">
                        {formatDateTime(new Date(m.starts_at))} · {MEETING_MODES[m.mode as keyof typeof MEETING_MODES]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">لا اجتماعات قادمة.</p>
            )}
          </section>

          <section className="rounded-lg border border-rule bg-surface p-4">
            <h2 className="mb-2 inline-flex items-center gap-2 font-display text-base font-bold">
              <Paperclip size={17} aria-hidden="true" className="text-brass" /> آخر ما سُلّم
            </h2>
            {(uploads ?? []).length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {(uploads ?? []).map((u) => (
                  <li key={u.id}>
                    <Link href={`/requests/${u.document_request_id}`} className="block hover:text-primary">
                      <span className="block [overflow-wrap:anywhere]">{u.title}</span>
                      <span className="text-xs text-ink-muted">{formatDateTime(new Date(u.created_at))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">لم يُسلَّم شيء بعد.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
