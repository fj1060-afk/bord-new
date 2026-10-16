import { ArrowDown, ArrowUp, FileText, Printer } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass } from "@/components/ui/styles";
import { DOC_REQUEST_STATUS, ITEM_KINDS } from "@/lib/meetings";
import { moveAgendaItem, removeAgendaItem } from "../_actions/agenda";
import { AgendaItemForm, DocumentRequestForm, EditableAgendaItem, ReviewDocumentButtons, type AgendaItem } from "./agenda-forms";
import { ownerOf, type Target } from "./agenda-targets";
import { UploadDocument } from "./upload-document";
import { RequirementsPanel, SendRequirementsBar, type RequirementRow } from "./requirements-panel";
import { ItemFindings } from "./item-review-panel";
import { reviewItem, type Disclosure } from "@/lib/item-review";
import type { Body, Template } from "@/lib/item-templates";

type Doc = { id: string; title: string; file_name: string; size_bytes: number | null; agenda_item_id: string | null; document_request_id: string | null };
type DocRequest = {
  id: string;
  agenda_item_id: string;
  department_id: string | null;
  assignee_user_id: string | null;
  title: string;
  due_date: string | null;
  status: keyof typeof DOC_REQUEST_STATUS;
  review_note: string | null;
  department: { name: string } | null;
};

function DocumentLink({ meetingId, doc }: { meetingId: string; doc: Doc }) {
  return (
    <a href={`/meetings/${meetingId}/documents/${doc.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
      <FileText size={16} aria-hidden="true" />
      {doc.title}
      {doc.size_bytes != null && <span className="font-mono text-xs text-ink-muted">{Math.max(1, Math.round(doc.size_bytes / 1024))} KB</span>}
    </a>
  );
}

export function AgendaTab({
  meetingId,
  items,
  documents,
  docRequests,
  targets,
  viewerId,
  dueDefault,
  editable,
  packPublished,
  myDepartmentIds,
  review,
  library,
  body,
  requirements,
  requirementsSentAt,
}: {
  requirements?: RequirementRow[];
  requirementsSentAt?: string | null;
  library?: Template[];
  body?: Body;
  review?: { disclosures: Disclosure[]; listed: boolean; year: number };
  meetingId: string;
  items: AgendaItem[];
  documents: Doc[];
  docRequests: DocRequest[];
  targets: Target[];
  viewerId: string;
  dueDefault?: string;
  editable: boolean;
  packPublished: boolean;
  myDepartmentIds: string[];
}) {
  const general = documents.filter((d) => !d.agenda_item_id);
  const targetName = (userId: string | null) => targets.find((t) => t.value === `user:${userId}`)?.label ?? "—";
  const ownerLabel = (item: AgendaItem) => targets.find((t) => t.value === ownerOf(item))?.label;

  return (
    <div className="flex flex-col gap-6">
      {items.length > 0 && (
        <a href={`/print/meetings/${meetingId}/agenda`} target="_blank" className={buttonClass("secondary", "w-fit")}>
          <Printer size={16} aria-hidden="true" /> طباعة الدعوة وجدول الأعمال
        </a>
      )}
      {!editable && !packPublished && documents.length === 0 && (
        <p className="rounded-md bg-brass-soft px-4 py-3 text-sm text-brass">تظهر مستندات الاجتماع هنا بعد نشر حزمة المجلس.</p>
      )}

      {editable && requirements && <SendRequirementsBar meetingId={meetingId} rows={requirements} targets={targets} sentAt={requirementsSentAt ?? null} />}
      <ol className="flex flex-col gap-4">
        {items.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا توجد بنود بعد.</li>}
        {items.map((item, index) => {
          const itemDocs = documents.filter((d) => d.agenda_item_id === item.id);
          const requests = docRequests.filter((r) => r.agenda_item_id === item.id);
          const content = (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-brass">{item.position}.</span>
                <h3 className="font-display text-lg font-bold">{item.title}</h3>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{ITEM_KINDS[item.kind]}</span>
                {item.duration_minutes && <span className="text-xs text-ink-muted">{item.duration_minutes} دقيقة</span>}
              </div>
              {(ownerLabel(item) || item.presenter) && (
                <p className="text-sm text-ink-muted">
                  {ownerLabel(item) && <>المسؤول: <strong className="text-ink">{ownerLabel(item)}</strong></>}
                  {ownerLabel(item) && item.presenter && item.presenter !== ownerLabel(item) && " · "}
                  {item.presenter && item.presenter !== ownerLabel(item) && <>يقدّمه: {item.presenter}</>}
                </p>
              )}
              {item.description && <p className="whitespace-pre-line text-sm leading-7">{item.description}</p>}
              {item.description_en && (
                <p dir="ltr" lang="en" className="whitespace-pre-line text-start text-xs leading-6 text-ink-muted">
                  {item.description_en}
                </p>
              )}
              {review && <ItemNotes findings={reviewItem(item, review)} />}
            </>
          );

          return (
            <li key={item.id} className="rounded-lg border border-rule bg-surface p-5">
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  {editable ? (
                    <EditableAgendaItem meetingId={meetingId} item={item} targets={targets} library={library} body={body}>
                      {content}
                    </EditableAgendaItem>
                  ) : (
                    <div className="flex flex-col gap-2">{content}</div>
                  )}
                </div>
                {editable && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <form action={moveAgendaItem.bind(null, meetingId, item.id, "up")}>
                      <button disabled={index === 0} aria-label="نقل للأعلى" className="rounded p-1.5 text-ink-muted hover:bg-primary-soft disabled:opacity-30">
                        <ArrowUp size={16} />
                      </button>
                    </form>
                    <form action={moveAgendaItem.bind(null, meetingId, item.id, "down")}>
                      <button disabled={index === items.length - 1} aria-label="نقل للأسفل" className="rounded p-1.5 text-ink-muted hover:bg-primary-soft disabled:opacity-30">
                        <ArrowDown size={16} />
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {(itemDocs.length > 0 || requests.length > 0 || editable) && (
                <div className="mt-4 flex flex-col gap-3 border-t border-rule pt-4">
                  {itemDocs.map((doc) => (
                    <DocumentLink key={doc.id} meetingId={meetingId} doc={doc} />
                  ))}
                  {requests.map((r) => (
                    <div key={r.id} className="flex flex-col gap-2 rounded-md bg-paper p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="min-w-0 flex-1">
                          مطلوب من {r.department?.name ?? (r.assignee_user_id === viewerId ? "حضرتك" : targetName(r.assignee_user_id))}: <strong>{r.title}</strong>
                          {r.due_date && <span className="text-ink-muted"> · حتى {r.due_date}</span>}
                        </span>
                        <span className={r.status === "accepted" ? "text-primary" : r.status === "returned" ? "text-danger" : "text-brass"}>
                          {DOC_REQUEST_STATUS[r.status]}
                        </span>
                        {editable && r.status === "submitted" && <ReviewDocumentButtons meetingId={meetingId} requestId={r.id} />}
                      </div>
                      {r.review_note && <p className="text-danger">ملاحظة: {r.review_note}</p>}
                      {(r.status === "requested" || r.status === "returned") && (editable || r.assignee_user_id === viewerId || (!!r.department_id && myDepartmentIds.includes(r.department_id))) && (
                        <UploadDocument meetingId={meetingId} agendaItemId={item.id} documentRequestId={r.id} label="تسليم المستند" />
                      )}
                    </div>
                  ))}
                  {editable && requirements && (
                    <RequirementsPanel meetingId={meetingId} itemId={item.id} rows={requirements.filter((r) => r.agenda_item_id === item.id)} targets={targets} dueDefault={dueDefault ?? ""} />
                  )}
                  {editable && (
                    <>
                      <UploadDocument meetingId={meetingId} agendaItemId={item.id} />
                      <DocumentRequestForm meetingId={meetingId} itemId={item.id} targets={targets} owner={ownerOf(item)} dueDate={dueDefault} />
                      <div>
                        <ConfirmButton action={removeAgendaItem.bind(null, meetingId, item.id)} label="حذف البند" confirm={`حذف البند "${item.title}"؟`} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {editable && (
        <details className="rounded-lg border border-rule bg-surface">
          <summary className={buttonClass("primary", "m-4 w-fit cursor-pointer list-none")}>إضافة بند</summary>
          <div className="border-t border-rule p-5">
            <AgendaItemForm meetingId={meetingId} targets={targets} library={library} body={body} />
          </div>
        </details>
      )}

      {(general.length > 0 || editable) && (
        <section className="rounded-lg border border-rule bg-surface p-5">
          <h2 className="mb-3 font-display text-lg font-bold">مستندات عامة للاجتماع</h2>
          <div className="flex flex-col gap-2">
            {general.map((doc) => (
              <DocumentLink key={doc.id} meetingId={meetingId} doc={doc} />
            ))}
            {general.length === 0 && <p className="text-sm text-ink-muted">لا توجد مستندات عامة.</p>}
          </div>
          {editable && (
            <div className="mt-4">
              <UploadDocument meetingId={meetingId} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ItemNotes({ findings }: { findings: ReturnType<typeof reviewItem> }) {
  if (!findings.length) return null;
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-brass">ملاحظات نظامية ({findings.length})</summary>
      <div className="mt-2">
        <ItemFindings findings={findings} />
      </div>
    </details>
  );
}
