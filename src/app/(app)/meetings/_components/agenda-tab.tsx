import { ArrowDown, ArrowUp, ChevronDown, Clock, FileText, FolderOpen, ListChecks, Paperclip, Plus, Trash2, UserRound } from "lucide-react";
import clsx from "clsx";
import { menuItem, RowMenu } from "@/components/ui/row-menu";
import { ConfirmButton } from "@/components/org/confirm-button";
import { buttonClass } from "@/components/ui/styles";
import { DOC_REQUEST_STATUS, ITEM_KINDS } from "@/lib/meetings";
import { moveAgendaItem, removeAgendaItem } from "../_actions/agenda";
import { AgendaItemForm, DocumentRequestForm, EditableAgendaItem, ReviewDocumentButtons, type AgendaItem } from "./agenda-forms";
import { ownerOf, partyName, type Target } from "./agenda-targets";
import { UploadDocument } from "./upload-document";
import { RequirementsPanel, type RequestMail, type RequirementRow } from "./requirements-panel";
import { SendByParty } from "./send-by-party";
import { ItemFindings } from "./item-review-panel";
import { AuthorityBadge } from "./authority-badge";
import { EditItemButton } from "./edit-item-button";
import { ExpandAll } from "./expand-all";
import { needsAction, type IssueItem } from "./item-issue-data";
import { IssueBadge, ItemFrame } from "./item-frame";
import { ItemNeeds } from "./item-issues";
import { FlipList } from "@/components/ui/flip-list";
import { reviewItem, type ReviewContext } from "@/lib/item-review";
import { bodyMismatch, duplicateOf } from "@/lib/item-body";
import { partyOf, withoutBeforeMeeting } from "@/lib/requirements";
import { matchTemplate, type Body, type Template } from "@/lib/item-templates";

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
      <FileText size={16} aria-hidden="true" className="shrink-0" />
      <span className="min-w-0 [overflow-wrap:anywhere]">{doc.title}</span>
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
  requestMails,
  issues,
}: {
  /** Open preparation checks per item (organizers only). */
  issues?: IssueItem[];
  requestMails?: RequestMail[];
  requirements?: RequirementRow[];
  requirementsSentAt?: string | null;
  library?: Template[];
  body?: Body;
  review?: Omit<ReviewContext, "template">;
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
  // Saved items are checked as drafts are: another body's wording first, then the rules.
  const notesFor = (item: AgendaItem) => {
    const mismatch = body ? bodyMismatch(item.title, library ?? [], body) : null;
    const twin = duplicateOf(item.title, items, item.id);
    const repeated = twin ? [{ level: "warn" as const, text: `البند مكرر: يطابق البند ${twin.position}. احذف أحدهما.` }] : [];
    return [...repeated, ...(mismatch ? [mismatch] : []), ...reviewItem(item, { ...review, template: matchTemplate(item.title, library, body) })];
  };
  const targetName = (userId: string | null) => targets.find((t) => t.value === `user:${userId}`)?.label ?? "—";
  const ownerLabel = (item: AgendaItem) => targets.find((t) => t.value === ownerOf(item))?.label;

  return (
    <div className="flex flex-col gap-6">
      {!editable && !packPublished && documents.length === 0 && (
        <p className="rounded-md bg-brass-soft px-4 py-3 text-sm text-brass">تظهر مستندات الاجتماع هنا بعد نشر حزمة المجلس.</p>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-40">
          <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
            <FileText size={18} aria-hidden="true" className="text-ink-muted" /> جدول الأعمال
          </h2>
          {items.length > 0 && (
            <p className="text-xs text-ink-muted">
              إجمالي {items.length === 1 ? "بند واحد" : items.length === 2 ? "بندين" : `${items.length} بنود`}
              {items.every((i) => i.kind === "decision") && " · جميع البنود للقرار"}
            </p>
          )}
        </div>
        {items.length > 1 && <ExpandAll listId="agenda-items" />}
        {editable && (
          <details id="add-item" className="scroll-mt-24 open:basis-full">
            <summary className={buttonClass("primary", "min-h-11 cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
              <Plus size={16} aria-hidden="true" /> إضافة بند جديد
            </summary>
            <div className="mt-3 rounded-lg border border-rule bg-surface p-5">
              <AgendaItemForm meetingId={meetingId} targets={targets} library={library} body={body} />
            </div>
          </details>
        )}
      </div>
      {/* One send box for the whole meeting, above the items it covers. */}
      {editable && requirements && requirements.length > 0 && <SendByParty meetingId={meetingId} rows={requirements} targets={targets} items={items} sentAt={requirementsSentAt ?? null} mails={requestMails} />}
      <FlipList as="ol" id="agenda-items" className="flex flex-col gap-3">
        {items.length === 0 && <li className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">لا توجد بنود بعد.</li>}
        {items.map((item, index) => {
          const itemDocs = documents.filter((d) => d.agenda_item_id === item.id);
          const requests = docRequests.filter((r) => r.agenda_item_id === item.id);
          const notes = review ? notesFor(item) : [];
          const waiting = requests.filter((r) => r.status !== "accepted").length;
          const description = withoutBeforeMeeting(item.description ?? "");
          const descriptionEn = withoutBeforeMeeting(item.description_en ?? "");
          const itemIssues = issues?.find((i) => i.anchor === `item-${item.id}`)?.issues ?? [];
          const needs = needsAction(itemIssues);
          // Who this item's unsent requests will reach, e.g. "الإدارة المالية (3) · الشؤون القانونية (1)".
          const reach = new Map<string, number>();
          for (const r of requirements ?? []) if (r.agenda_item_id === item.id && r.status === "draft") reach.set(partyName(partyOf(r), targets), (reach.get(partyName(partyOf(r), targets)) ?? 0) + 1);
          const sendPreview = [...reach].map(([who, n]) => `${who} (${n})`).join(" · ");
          const content = (
            <>
              {ownerLabel(item) && (
                <p className="text-sm text-ink-muted">
                  المسؤول: <strong className="text-ink">{ownerLabel(item)}</strong>
                </p>
              )}
              {(description || descriptionEn) && (
                <details className="group/desc rounded-md border border-rule">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-paper [&::-webkit-details-marker]:hidden">
                    <ListChecks size={16} aria-hidden="true" className="shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">{/(بعد القرار:|After the resolution:)/.test(description + descriptionEn) ? "الوصف وما بعد القرار" : "الوصف"}</span>
                    <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/desc:rotate-180" />
                  </summary>
                  <div className="flex flex-col gap-3 border-t border-rule px-3 py-3">
                    {description && <p className="whitespace-pre-line text-sm leading-7">{description}</p>}
                    {descriptionEn && (
                      <p dir="ltr" lang="en" className="whitespace-pre-line border-t border-rule pt-3 text-start text-xs leading-6 text-ink-muted">
                        {descriptionEn}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </>
          );

          return (
            <ItemFrame key={item.id} level={needs.level} count={needs.count} id={`item-${item.id}`} data-flip-key={item.id} data-flip-state={`${notes.length}:${waiting}`} className="scroll-mt-24 rounded-lg border bg-surface">
              {/* The «⋮» menu sits in the card's corner, so the title keeps the full width on a phone. */}
              <div className="relative">
                <details className="group">
                  <summary className={clsx("flex cursor-pointer list-none flex-wrap items-start gap-3 p-3 hover:bg-paper sm:p-4 [&::-webkit-details-marker]:hidden", editable && "md:pe-14")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary-soft font-mono text-base font-bold text-primary">{item.position}</span>
                    {/* On a phone: number and controls on top, the title full width beneath; side by side from md. */}
                    <span className="order-last grid min-w-0 basis-full gap-1.5 md:order-none md:flex-1 md:basis-0 md:grid-cols-2 md:gap-5">
                      <span className="min-w-0">
                        <span className="block font-display text-base font-bold leading-7">{item.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{ITEM_KINDS[item.kind]}</span>
                          <AuthorityBadge authority={matchTemplate(item.title, library, body)?.authority} />
                          {waiting > 0 && <span className="text-brass">{waiting} مستند مطلوب</span>}
                        </span>
                      </span>
                      {item.title_en && (
                        <span dir="ltr" lang="en" className="min-w-0 text-start text-sm leading-6 text-ink-muted md:border-e md:border-rule md:pe-5">
                          {item.title_en}
                        </span>
                      )}
                    </span>
                    <span className={clsx("ms-auto flex items-center gap-2 md:ms-0", editable && "me-10 md:me-0")}>
                      {issues && <IssueBadge level={needs.level} count={needs.count} />}
                      <ChevronDown size={18} aria-hidden="true" className="mt-1 shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open:rotate-180" />
                    </span>
                    <span className="order-last grid basis-full overflow-hidden rounded-md border border-rule bg-paper text-xs sm:grid-cols-3">
                      {(
                        [
                          [UserRound, "العرض", item.presenter || ownerLabel(item) || "غير محدد"],
                          [Clock, "المدة", item.duration_minutes ? `${item.duration_minutes} دقيقة` : "غير محددة"],
                          [Paperclip, "المرفقات", itemDocs.length ? `${itemDocs.length}` : "لا توجد مرفقات"],
                        ] as const
                      ).map(([Icon, label, value]) => (
                        <span key={label} className="flex items-center gap-2 border-rule px-3 py-2 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-e">
                          <Icon size={14} aria-hidden="true" className="shrink-0 text-brass" />
                          <span className="text-ink-muted">{label}</span>
                          <span className="ms-auto truncate text-ink sm:ms-0">{value}</span>
                        </span>
                      ))}
                    </span>
                  </summary>

                  <div className="border-t border-rule p-4">
                    {(issues || review) && <ItemNeeds meetingId={meetingId} itemId={item.id} issues={itemIssues} sendPreview={sendPreview} notes={<ItemFindings findings={notes} />} notesCount={notes.length} />}
                    {editable ? (
                      <EditableAgendaItem meetingId={meetingId} item={item} targets={targets} library={library} body={body}>
                        {content}
                      </EditableAgendaItem>
                    ) : (
                      <div className="flex flex-col gap-2">{content}</div>
                    )}
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
                        <RequirementsPanel
                          meetingId={meetingId}
                          itemId={item.id}
                          rows={requirements.filter((r) => r.agenda_item_id === item.id)}
                          targets={targets}
                          dueDefault={dueDefault ?? ""}
                        />
                      )}
                      {editable && (
                        <>
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-ink-muted">مستندات البند</p>
                            <UploadDocument meetingId={meetingId} agendaItemId={item.id} />
                            <DocumentRequestForm meetingId={meetingId} itemId={item.id} targets={targets} owner={ownerOf(item)} dueDate={dueDefault} />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </details>
                {editable && (
                  <div className="absolute end-2 top-2.5 sm:end-3 sm:top-3.5">
                    <RowMenu label={`إجراءات البند ${item.position}`}>
                      <EditItemButton itemId={item.id} title={item.title} />
                      <form action={moveAgendaItem.bind(null, meetingId, item.id, "up")}>
                        <button disabled={index === 0} className={clsx(menuItem, "disabled:opacity-40")}>
                          <ArrowUp size={15} aria-hidden="true" /> نقل للأعلى
                        </button>
                      </form>
                      <form action={moveAgendaItem.bind(null, meetingId, item.id, "down")}>
                        <button disabled={index === items.length - 1} className={clsx(menuItem, "disabled:opacity-40")}>
                          <ArrowDown size={15} aria-hidden="true" /> نقل للأسفل
                        </button>
                      </form>
                      <span className="mt-1 block border-t border-rule pt-1">
                        <ConfirmButton action={removeAgendaItem.bind(null, meetingId, item.id)} label={`حذف البند ${item.position}`} variant="menu-danger" className="gap-2" icon={<><Trash2 size={15} aria-hidden="true" /> حذف البند</>} confirm={`حذف البند "${item.title}"؟`} />
                      </span>
                    </RowMenu>
                  </div>
                )}
              </div>
            </ItemFrame>
          );
        })}
      </FlipList>

      {(general.length > 0 || editable) && (
        <section className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4 sm:p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold">
              <FolderOpen size={18} aria-hidden="true" className="text-ink-muted" /> مستندات الاجتماع العامة
            </h2>
            <p className="text-xs text-ink-muted">مستندات غير مرتبطة ببند محدد في جدول الأعمال</p>
          </div>
          {general.length > 0 && (
            <ul className="flex flex-col divide-y divide-rule rounded-md border border-rule">
              {general.map((doc) => (
                <li key={doc.id} className="px-3 py-2.5">
                  <DocumentLink meetingId={meetingId} doc={doc} />
                </li>
              ))}
            </ul>
          )}
          {general.length === 0 && !editable && <p className="text-sm text-ink-muted">لا توجد مستندات عامة.</p>}
          {editable && <UploadDocument meetingId={meetingId} />}
        </section>
      )}
    </div>
  );
}
