import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { riyadhToday } from "@/lib/minutes";
import { statusLabel } from "@/lib/offices";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { deleteContact, deleteDraft, setCorrespondenceStatus } from "./actions";
import { ContactForm, CorrespondenceForm, type Letter } from "./forms";

export const metadata: Metadata = { title: "مكتب المدير" };

const TABS = { inbox: "الوارد", drafts: "المسودات", followups: "المتابعات", contacts: "جهات الاتصال" } as const;
type Row = Letter & { direction: "incoming" | "outgoing"; status: string; created_at: string; contact: { name: string; organization: string | null } | null };

const day = (d: string) => formatGregorianDate(new Date(`${d}T12:00:00Z`));

export default async function DirectorOfficePage({ searchParams }: PageProps<"/director-office">) {
  const viewer = await requirePage("/director-office");
  const params = (await searchParams) as Record<string, string | undefined>;
  const tab = params.tab && params.tab in TABS ? (params.tab as keyof typeof TABS) : "inbox";
  const closed = params.closed === "1";
  const canEdit = can(viewer.permissions, "/director-office", LEVELS.edit);
  const today = riyadhToday();
  const supabase = await createClient();

  const { data: contacts } = await supabase.from("contacts").select("id, name, organization, title, email, phone, notes").order("name");
  let query = supabase.from("correspondence").select("id, direction, status, subject, body, reference, contact_id, dated_on, due_date, created_at, contact:contacts(name, organization)");
  if (tab === "inbox") query = query.eq("direction", "incoming").order("created_at", { ascending: false });
  if (tab === "inbox") query = closed ? query.eq("status", "closed") : query.neq("status", "closed");
  if (tab === "drafts") query = query.eq("direction", "outgoing").eq("status", closed ? "sent" : "draft").order("updated_at", { ascending: false });
  if (tab === "followups") query = query.not("due_date", "is", null).neq("status", "closed").order("due_date");
  const { data: letters } = tab === "contacts" ? { data: [] } : await query;
  const rows = (letters ?? []) as unknown as Row[];

  const action = (r: Row, status: string, label: string, confirm: string) => (
    <ConfirmButton action={setCorrespondenceStatus.bind(null, r.id, status)} label={label} confirm={confirm} variant="secondary" />
  );

  return (
    <>
      <PageHeader section="المكاتب" title="مكتب المدير" description="المراسلات الواردة والصادرة، ومتابعتها، وجهات الاتصال." />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm" aria-label="أقسام مكتب المدير">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/director-office?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("shrink-0 border-b-2 px-4 py-2.5", tab === key ? "border-brass font-medium" : "border-transparent text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </nav>

      {tab === "contacts" ? (
        <>
          {canEdit && <ContactForm />}
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {(contacts ?? []).length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد جهات اتصال.</li>}
            {(contacts ?? []).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-ink-muted">{[c.title, c.organization, c.notes].filter(Boolean).join(" · ")}</span>
                </span>
                {c.email && <a href={`mailto:${c.email}`} dir="ltr" className="text-xs text-primary hover:underline">{c.email}</a>}
                {c.phone && <a href={`tel:${c.phone}`} dir="ltr" className="font-mono text-xs text-primary hover:underline">{c.phone}</a>}
                {canEdit && <ConfirmButton action={deleteContact.bind(null, c.id)} label="حذف" confirm={`حذف ${c.name}؟`} />}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {canEdit && tab === "inbox" && <CorrespondenceForm direction="incoming" contacts={contacts ?? []} label="تسجيل وارد" />}
          {canEdit && tab === "drafts" && <CorrespondenceForm direction="outgoing" contacts={contacts ?? []} label="مسودة جديدة" />}
          {tab !== "followups" && (
            <div className="mb-3 flex justify-end text-sm">
              <Link href={`/director-office?tab=${tab}${closed ? "" : "&closed=1"}`} className="text-ink-muted hover:underline">
                {closed ? "عرض الحالي" : tab === "inbox" ? "عرض المغلق" : "عرض المُرسل"}
              </Link>
            </div>
          )}
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {rows.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد مراسلات.</li>}
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{statusLabel(r.direction, r.status)}</span>
                  {tab === "followups" && <span className="text-xs text-ink-muted">{r.direction === "incoming" ? "وارد" : "صادر"}</span>}
                  <span className="min-w-0 flex-1 font-medium">{r.subject}</span>
                  {r.contact && <span className="text-xs text-ink-muted">{r.contact.name}</span>}
                  {r.reference && <span className="font-mono text-xs text-ink-muted">{r.reference}</span>}
                  {r.dated_on && <span className="text-xs text-ink-muted">{day(r.dated_on)}</span>}
                  {r.due_date && <span className={clsx("text-xs", r.due_date < today ? "text-danger" : "text-brass")}>متابعة: {day(r.due_date)}</span>}
                </div>
                {r.body && <p className="line-clamp-3 whitespace-pre-line text-ink-muted">{r.body}</p>}
                {canEdit && (
                  <div className="flex flex-wrap items-start gap-2">
                    {r.status !== "closed" && <CorrespondenceForm direction={r.direction} contacts={contacts ?? []} letter={r} label="تعديل" />}
                    {r.status === "new" && action(r, "in_progress", "بدء المعالجة", "تحويل الوارد إلى قيد المعالجة؟")}
                    {r.status === "draft" && action(r, "sent", "تم الإرسال", "تسجيل المسودة كخطاب مُرسل بتاريخ اليوم؟")}
                    {r.status === "draft" && <ConfirmButton action={deleteDraft.bind(null, r.id)} label="حذف" confirm="حذف المسودة؟" />}
                    {r.status !== "closed" && r.status !== "draft" && action(r, "closed", "إغلاق", "إغلاق المراسلة؟ تخرج من المتابعات.")}
                    {r.status === "closed" && action(r, r.direction === "incoming" ? "in_progress" : "sent", "إعادة فتح", "إعادة فتح المراسلة؟")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
