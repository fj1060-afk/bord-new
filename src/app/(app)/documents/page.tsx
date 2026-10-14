import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { FileText } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { fileSize, LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/library";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { setArchived } from "./actions";
import { UploadLibraryDocument } from "./upload-library";

export const metadata: Metadata = { title: "المستندات" };

type MeetingDoc = {
  id: string;
  title: string;
  size_bytes: number | null;
  created_at: string;
  meeting: { id: string; title: string; starts_at: string; board: { name: string } | null; committee: { name: string } | null } | null;
};

// Strip characters that have meaning in PostgREST filter syntax.
const searchTerm = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const viewer = await requirePage("/documents");
  const { tab = "library", q = "", category = "", archived = "" } = (await searchParams) as Record<string, string | undefined>;
  const canEdit = can(viewer.permissions, "/documents", LEVELS.edit);
  const term = searchTerm(q ?? "");
  const supabase = await createClient();

  let libraryQuery = supabase
    .from("library_documents")
    .select("id, title, category, file_name, size_bytes, archived, created_at")
    .eq("archived", archived === "1")
    .order("created_at", { ascending: false });
  if (category && category in LIBRARY_CATEGORIES) libraryQuery = libraryQuery.eq("category", category);
  if (term) libraryQuery = libraryQuery.ilike("title", `%${term}%`);

  let meetingQuery = supabase
    .from("meeting_documents")
    .select("id, title, size_bytes, created_at, meeting:meetings(id, title, starts_at, board:boards(name), committee:committees(name))")
    .order("created_at", { ascending: false })
    .limit(100);
  if (term) meetingQuery = meetingQuery.ilike("title", `%${term}%`);

  const [{ data: library }, { data: meetingDocs }] = await Promise.all([tab === "library" ? libraryQuery : Promise.resolve({ data: [] }), tab === "meetings" ? meetingQuery : Promise.resolve({ data: [] })]);
  const link = (params: Record<string, string>) => `/documents?${new URLSearchParams({ tab, ...(q ? { q } : {}), ...params })}`;

  return (
    <>
      <PageHeader section="الحوكمة" title="المستندات" description="مكتبة السياسات واللوائح والتقارير، ومستندات الاجتماعات المتاحة لك." />

      <nav className="mb-4 flex gap-1 border-b border-rule text-sm" aria-label="أقسام المستندات">
        {[
          ["library", "المكتبة"],
          ["meetings", "مستندات الاجتماعات"],
        ].map(([key, label]) => (
          <Link key={key} href={`/documents?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("border-b-2 px-4 py-2.5", tab === key ? "border-brass font-medium" : "border-transparent text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tab" value={tab} />
        <input name="q" defaultValue={q} placeholder="ابحث بعنوان المستند" className="min-w-0 flex-1 rounded-md border border-rule bg-surface px-3 py-2 text-sm" />
        <button className="rounded-md border border-rule bg-surface px-4 py-2 text-sm hover:bg-primary-soft">بحث</button>
      </form>

      {tab === "library" ? (
        <>
          {canEdit && <UploadLibraryDocument />}
          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            {[["", "الكل"], ...Object.entries(LIBRARY_CATEGORIES)].map(([value, label]) => (
              <Link key={value} href={link(value ? { category: value } : {})} className={clsx("rounded-full px-3 py-1", category === value || (!category && !value) ? "bg-primary text-on-primary" : "border border-rule bg-surface hover:bg-primary-soft")}>
                {label}
              </Link>
            ))}
            <Link href={link(archived === "1" ? {} : { archived: "1" })} className="ms-auto text-ink-muted hover:underline">
              {archived === "1" ? "عرض المستندات الحالية" : "عرض المؤرشفة"}
            </Link>
          </div>
          <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
            {(library ?? []).length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد مستندات.</li>}
            {(library ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <a href={`/documents/library/${d.id}`} className="flex min-w-0 flex-1 items-center gap-2 font-medium text-primary hover:underline">
                  <FileText size={16} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{d.title}</span>
                </a>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">{LIBRARY_CATEGORIES[d.category as LibraryCategory]}</span>
                <span className="font-mono text-xs text-ink-muted">{fileSize(d.size_bytes)}</span>
                <span className="text-xs text-ink-muted">{formatGregorianDate(new Date(d.created_at))}</span>
                {canEdit && <ConfirmButton action={setArchived.bind(null, d.id, !d.archived)} label={d.archived ? "استعادة" : "أرشفة"} variant="secondary" confirm={d.archived ? "استعادة المستند؟" : "أرشفة المستند؟ يبقى محفوظاً ويمكن استعادته."} />}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
          {(meetingDocs ?? []).length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا توجد مستندات اجتماعات متاحة لك.</li>}
          {((meetingDocs ?? []) as unknown as MeetingDoc[]).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
              {d.meeting && (
                <a href={`/meetings/${d.meeting.id}/documents/${d.id}`} className="flex min-w-0 flex-1 items-center gap-2 font-medium text-primary hover:underline">
                  <FileText size={16} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{d.title}</span>
                </a>
              )}
              {d.meeting && (
                <Link href={`/meetings/${d.meeting.id}?tab=agenda`} className="text-xs text-ink-muted hover:underline">
                  {(d.meeting.board ?? d.meeting.committee)?.name} · {d.meeting.title}
                </Link>
              )}
              <span className="font-mono text-xs text-ink-muted">{fileSize(d.size_bytes)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
