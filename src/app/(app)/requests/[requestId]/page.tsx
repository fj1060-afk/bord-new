import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarClock, ChevronLeft, FileText, Hash, Landmark, MessageSquareWarning, Paperclip } from "lucide-react";
import { requirePage } from "@/lib/auth";
import { formatDateTime, formatGregorianDate } from "@/lib/format";
import { riyadhToday } from "@/lib/minutes";
import { isLate, needsAction, portalEnabled, stageOf } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { UploadDocument } from "../../meetings/_components/upload-document";
import { LateBadge, StagePill } from "../_parts/request-list";

export const metadata: Metadata = { title: "تفاصيل الطلب" };

type Request = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  review_note: string | null;
  created_at: string;
  department_id: string | null;
  assignee_user_id: string | null;
  department: { name: string } | null;
  item: { id: string; position: number; title: string; title_en: string | null; meeting: { id: string; title: string; starts_at: string; board_id: string | null; committee: { name: string } | null } };
};

/** One request: what is asked and by when, the files sent for it, and uploading while it waits on the department. */
export default async function RequestPage({ params }: PageProps<"/requests/[requestId]">) {
  if (!portalEnabled()) notFound();
  const viewer = await requirePage("/my-tasks");
  const { requestId } = await params;
  const supabase = await createClient();
  const [{ data }, { data: docs }, { data: delegations }] = await Promise.all([
    supabase
      .from("document_requests")
      .select("id, title, due_date, status, review_note, created_at, department_id, assignee_user_id, department:departments(name), item:agenda_items!inner(id, position, title, title_en, meeting:meetings!agenda_items_meeting_id_fkey!inner(id, title, starts_at, board_id, committee:committees(name)))")
      .eq("id", requestId)
      .maybeSingle(),
    supabase.from("meeting_documents").select("id, title, file_name, size_bytes, created_at").eq("document_request_id", requestId).order("created_at"),
    supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id),
  ]);
  if (!data) notFound();
  const r = data as unknown as Request;
  const stage = stageOf("document", r.status) ?? "new";
  const late = isLate(r.due_date, stage, riyadhToday());
  const meeting = r.item.meeting;
  const mine = r.assignee_user_id === viewer.id || (delegations ?? []).some((d) => d.department_id === r.department_id);
  const from = meeting.board_id ? "أمانة سر مجلس الإدارة" : `أمانة سر ${meeting.committee?.name ?? "اللجنة"}`;
  const facts: [typeof Landmark, string, string][] = [
    [Landmark, "الجهة الطالبة", from],
    [Hash, "الاجتماع", `${meeting.title} · ${formatDateTime(new Date(meeting.starts_at))}`],
    [FileText, "البند", `${r.item.position}. ${r.item.title}`],
    [Building2, "الإدارة المسؤولة", r.department?.name ?? (r.assignee_user_id === viewer.id ? "أنت" : "مكلّف بالاسم")],
    [CalendarClock, "الموعد النهائي", r.due_date ? formatGregorianDate(new Date(`${r.due_date}T12:00:00+03:00`)) : "غير محدد"],
  ];

  return (
    <>
      <nav aria-label="المسار" className="mb-3 flex items-center gap-1 text-xs text-brass">
        <Link href="/requests" className="hover:underline">
          الطلبات
        </Link>
        <ChevronLeft size={13} aria-hidden="true" className="text-ink-muted" />
        <span className="text-ink-muted">تفاصيل الطلب</span>
      </nav>
      <header className="mb-5 flex flex-col gap-2 border-b border-rule pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-bold sm:text-2xl">{r.title}</h1>
          <StagePill stage={stage} />
          {late && <LateBadge />}
        </div>
        <p className="text-sm text-ink-muted">
          {meeting.title} · البند {r.item.position}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-rule bg-surface p-4 sm:p-5">
            <h2 className="mb-2 font-display text-lg font-bold">المطلوب</h2>
            <p className="text-sm leading-7">
              يُرجى تزويد {from} بـ«{r.title}» لبند «{r.item.title}»{r.due_date ? ` قبل ${formatGregorianDate(new Date(`${r.due_date}T12:00:00+03:00`))}` : ""}.
            </p>
            {r.review_note && stage === "returned" && (
              <p className="mt-3 flex items-start gap-2 rounded-md border border-brass/50 bg-brass-soft px-3 py-2.5 text-sm text-brass">
                <MessageSquareWarning size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> ملاحظة الأمانة: {r.review_note}
              </p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4 sm:p-5">
            <h2 className="font-display text-lg font-bold">المستندات المرفقة ({(docs ?? []).length})</h2>
            {(docs ?? []).length > 0 && (
              <ul className="flex flex-col divide-y divide-rule rounded-md border border-rule">
                {(docs ?? []).map((d) => (
                  <li key={d.id} className="px-3 py-2.5">
                    <a href={`/meetings/${meeting.id}/documents/${d.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Paperclip size={15} aria-hidden="true" className="shrink-0" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{d.title}</span>
                      {d.size_bytes != null && <span className="ms-auto shrink-0 font-mono text-xs text-ink-muted">{Math.max(1, Math.round(d.size_bytes / 1024))} KB</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {mine && needsAction(stage) ? (
              <UploadDocument meetingId={meeting.id} agendaItemId={r.item.id} documentRequestId={r.id} label="رفع المستند" />
            ) : (
              (docs ?? []).length === 0 && <p className="text-sm text-ink-muted">لا مستندات بعد.</p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-3 self-start rounded-lg border border-rule bg-surface p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold">معلومات الطلب</h2>
          <dl className="flex flex-col gap-3 text-sm">
            {facts.map(([Icon, label, value]) => (
              <div key={label} className="flex items-start gap-2.5">
                <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-brass" />
                <div className="min-w-0">
                  <dt className="text-xs text-ink-muted">{label}</dt>
                  <dd className={label === "الموعد النهائي" && late ? "text-danger" : ""}>{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </>
  );
}
