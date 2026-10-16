import type { Metadata } from "next";
import Link from "next/link";
import clsx from "clsx";
import { RegulationNote } from "@/components/ui/regulation-note";
import { NOTES } from "@/lib/regulations";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { can, LEVELS } from "@/lib/permissions";
import { companyProfile } from "@/lib/live-server";
import { createClient } from "@/lib/supabase/server";
import { BoardForm } from "./board-forms";
import { BoardOverview } from "./_tabs/overview";
import { BoardMembers } from "./_tabs/members";
import { BoardCommittees, BoardDocuments, BoardMeetings, BoardResolutions } from "./_tabs/lists";

export const metadata: Metadata = { title: "مجلس الإدارة" };

const TABS = {
  overview: "لوحة المجلس",
  members: "الأعضاء",
  meetings: "الاجتماعات",
  resolutions: "القرارات",
  documents: "المستندات",
  committees: "اللجان التابعة",
} as const;
type Tab = keyof typeof TABS;

export default async function BoardPage({ searchParams }: PageProps<"/board">) {
  const viewer = await requirePage("/board");
  const { tab: raw } = (await searchParams) as { tab?: string };
  const tab: Tab = raw && raw in TABS ? (raw as Tab) : "overview";
  const canEdit = can(viewer.permissions, "/board", LEVELS.edit);
  const canManage = can(viewer.permissions, "/board", LEVELS.manage);
  const supabase = await createClient();
  const maxYears = (await companyProfile(supabase))?.max_term_years ?? 4;

  const { data: board } = await supabase
    .from("boards")
    .select("id, name, term_start, term_end")
    .eq("status", "active")
    .order("term_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!board) {
    return (
      <>
        <PageHeader section="الحوكمة" title="مجلس الإدارة" />
        <div className="rounded-lg border border-dashed border-rule bg-surface p-8">
          {canManage ? (
            <>
              <p className="mb-5 font-display text-lg font-bold">أنشئ المجلس وحدد دورته للبدء.</p>
              <BoardForm maxYears={maxYears} />
            </>
          ) : (
            <p className="text-center text-ink-muted">لم يُنشأ المجلس بعد.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        section="الحوكمة"
        title={board.name}
        description={`الدورة من ${formatGregorianDate(new Date(board.term_start))} إلى ${formatGregorianDate(new Date(board.term_end))}`}
      />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-rule text-sm" aria-label="أقسام مجلس الإدارة">
        {Object.entries(TABS).map(([key, label]) => (
          <Link key={key} href={`/board?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={clsx("shrink-0 border-b-2 px-4 py-2.5", tab === key ? "border-brass font-medium" : "border-transparent text-ink-muted hover:text-ink")}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <BoardOverview board={board} canEdit={canEdit} />}
      {tab === "members" && (
        <>
          <RegulationNote notes={NOTES.board} />
          <BoardMembers board={board} canEdit={canEdit} canManage={canManage} maxYears={maxYears} />
        </>
      )}
      {tab === "meetings" && <BoardMeetings boardId={board.id} canEdit={can(viewer.permissions, "/meetings", LEVELS.edit)} />}
      {tab === "resolutions" && <BoardResolutions boardId={board.id} />}
      {tab === "documents" && <BoardDocuments boardId={board.id} />}
      {tab === "committees" && <BoardCommittees boardId={board.id} />}
    </>
  );
}
