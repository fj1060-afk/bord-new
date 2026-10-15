import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { DOC_REQUEST_STATUS, ITEM_KINDS, MEETING_STATUS, REQUEST_STATUS, meetingReference } from "@/lib/meetings";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AgendaRequestForm, ReviewAgendaRequestForm } from "./_components/meeting-forms";

export const metadata: Metadata = { title: "الاجتماعات" };

type MeetingRow = {
  id: string;
  title: string;
  number: number | null;
  starts_at: string;
  status: keyof typeof MEETING_STATUS;
  board_id: string | null;
  committee_id: string | null;
  board: { name: string } | null;
  committee: { name: string } | null;
};

export default async function MeetingsPage({ searchParams }: PageProps<"/meetings">) {
  const viewer = await requirePage("/meetings");
  const { show = "upcoming" } = (await searchParams) as { show?: string };
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("meetings")
    .select("id, title, number, starts_at, status, board_id, committee_id, board:boards(name), committee:committees(name)");
  query = show === "past" ? query.lt("starts_at", now).order("starts_at", { ascending: false }) : query.gte("starts_at", now).order("starts_at");

  const [{ data: meetings }, { data: requests }, { data: delegations }, { data: docRequests }, { data: bodies }] = await Promise.all([
    query.limit(50),
    supabase
      .from("agenda_requests")
      .select("id, title, description, kind, status, review_note, board_id, committee_id, created_at, department:departments(name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("department_delegates").select("department:departments(id, name)").eq("user_id", viewer.id),
    supabase
      .from("document_requests")
      .select("id, title, due_date, status, agenda_item:agenda_items(meeting_id, title)")
      .in("status", ["requested", "returned"])
      .order("due_date"),
    supabase.rpc("list_meeting_bodies"),
  ]);
  const rows = (meetings ?? []) as unknown as MeetingRow[];
  const myDepartments = (delegations ?? []).flatMap((d) => (d.department ? [d.department as unknown as { id: string; name: string }] : []));
  const upcomingByBody = (bodyId: string | null) =>
    rows
      .filter((m) => show !== "past" && m.status !== "cancelled" && (m.board_id === bodyId || m.committee_id === bodyId))
      .map((m) => ({ id: m.id, name: `${m.title} · ${formatDateTime(new Date(m.starts_at))}` }));

  return (
    <>
      <PageHeader
        section="الحوكمة"
        title="الاجتماعات"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/meetings/library" className={buttonClass("secondary")}>
              مستودع البنود
            </Link>
            {organizer && (
              <Link href="/meetings/new" className={buttonClass()}>
                <Plus size={16} aria-hidden="true" /> اجتماع جديد
              </Link>
            )}
          </div>
        }
      />

      {!organizer && (docRequests ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-xl font-bold">مستندات مطلوبة من إدارتك</h2>
          <ul className="divide-y divide-rule rounded-lg border border-brass bg-surface">
            {(docRequests ?? []).map((r) => {
              const item = r.agenda_item as unknown as { meeting_id: string; title: string };
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{r.title}</span>
                    <span className="block text-xs text-ink-muted">البند: {item.title}</span>
                  </span>
                  <span className="text-brass">{DOC_REQUEST_STATUS[r.status as keyof typeof DOC_REQUEST_STATUS]}</span>
                  {r.due_date && <span className="text-ink-muted">حتى {r.due_date}</span>}
                  <Link href={`/meetings/${item.meeting_id}?tab=agenda`} className={buttonClass("secondary", "px-3 py-1 text-xs")}>
                    رفع المستند
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <nav className="mb-4 flex gap-2 text-sm" aria-label="الفترة">
        {[
          ["upcoming", "القادمة"],
          ["past", "السابقة"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={`/meetings?show=${value}`}
            aria-current={show === value ? "page" : undefined}
            className={clsx("rounded-full px-4 py-1.5", show === value ? "bg-primary text-on-primary" : "border border-rule bg-surface hover:bg-primary-soft")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <ul className="mb-10 divide-y divide-rule rounded-lg border border-rule bg-surface">
        {rows.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد اجتماعات {show === "past" ? "سابقة" : "قادمة"}.</li>}
        {rows.map((m) => (
          <li key={m.id}>
            <Link href={`/meetings/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-paper">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{m.title}</span>
                <span className="block text-xs text-ink-muted">
                  {(m.board ?? m.committee)?.name} · {meetingReference(m.number, m.starts_at)}
                </span>
              </span>
              <span className="text-sm">{formatDateTime(new Date(m.starts_at))}</span>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-0.5 text-xs",
                  m.status === "scheduled" && "bg-primary-soft text-primary",
                  m.status === "draft" && "bg-brass-soft text-brass",
                  m.status === "cancelled" && "border border-rule text-ink-muted line-through",
                )}
              >
                {MEETING_STATUS[m.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">طلبات إضافة بنود</h2>
        {myDepartments.length > 0 && (
          <details className="mb-4 rounded-lg border border-rule bg-surface">
            <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>طلب إضافة بند</summary>
            <div className="border-t border-rule p-5">
              <AgendaRequestForm departments={myDepartments} bodies={(bodies ?? []) as { id: string; name: string; kind: string }[]} />
            </div>
          </details>
        )}
        <ul className="flex flex-col gap-3">
          {(requests ?? []).length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-6 text-center text-sm text-ink-muted">لا توجد طلبات.</li>}
          {(requests ?? []).map((r) => (
            <li key={r.id} className="rounded-lg border border-rule bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{r.title}</span>
                <span className={r.status === "pending" ? "text-brass" : r.status === "accepted" ? "text-primary" : "text-danger"}>
                  {REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS]}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {(r.department as unknown as { name: string } | null)?.name} · {ITEM_KINDS[r.kind as keyof typeof ITEM_KINDS]} · {formatDateTime(new Date(r.created_at))}
              </p>
              {r.description && <p className="mt-2 whitespace-pre-line">{r.description}</p>}
              {r.review_note && <p className="mt-2 text-ink-muted">ملاحظة المراجعة: {r.review_note}</p>}
              {organizer && r.status === "pending" && (
                <ReviewAgendaRequestForm requestId={r.id} meetings={upcomingByBody(r.board_id ?? r.committee_id)} />
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
