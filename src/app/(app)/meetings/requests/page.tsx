import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass } from "@/components/ui/styles";
import { requirePage } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { DOC_REQUEST_STATUS, ITEM_KINDS, REQUEST_STATUS } from "@/lib/meetings";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { AgendaRequestForm, ReviewAgendaRequestForm } from "../_components/meeting-forms";

export const metadata: Metadata = { title: "طلبات البنود" };

/** Agenda item requests from departments, and documents asked of them; organizers review requests into meetings. */
export default async function AgendaRequestsPage() {
  const viewer = await requirePage("/meetings");
  const organizer = can(viewer.permissions, "/meetings", LEVELS.edit);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: meetings }, { data: requests }, { data: delegations }, { data: docRequests }, { data: bodies }] = await Promise.all([
    supabase.from("meetings").select("id, title, starts_at, status, board_id, committee_id").gte("starts_at", now).neq("status", "cancelled").order("starts_at").limit(50),
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
  const rows = meetings ?? [];
  const myDepartments = (delegations ?? []).flatMap((d) => (d.department ? [d.department as unknown as { id: string; name: string }] : []));
  const upcomingByBody = (bodyId: string | null) =>
    rows
      .filter((m) => m.board_id === bodyId || m.committee_id === bodyId)
      .map((m) => ({ id: m.id, name: `${m.title} · ${formatDateTime(new Date(m.starts_at))}` }));

  return (
    <>
      <PageHeader section="عام" title="طلبات البنود" description="طلبات الإدارات لإضافة بنود إلى الاجتماعات، والمستندات المطلوبة منها." />

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
