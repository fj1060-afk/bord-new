import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { RegulationNote } from "@/components/ui/regulation-note";
import { requirePage } from "@/lib/auth";
import { companyProfile } from "@/lib/live-server";
import { can, LEVELS } from "@/lib/permissions";
import { NOTES } from "@/lib/regulations";
import { createClient } from "@/lib/supabase/server";
import { activeBoard, NoBoard } from "../_parts/board";
import { BoardMembers } from "../_parts/members";

export const metadata: Metadata = { title: "أعضاء المجلس" };

export default async function BoardMembersPage() {
  const viewer = await requirePage("/board");
  const canManage = can(viewer.permissions, "/board", LEVELS.manage);
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={canManage} />;
  const maxYears = (await companyProfile(await createClient()))?.max_term_years ?? 4;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="الأعضاء" description="تشكيل المجلس، وتسجيل الأعضاء وملفاتهم، والإدارة التنفيذية." />
      <RegulationNote notes={NOTES.board} />
      <BoardMembers board={board} canEdit={can(viewer.permissions, "/board", LEVELS.edit)} canManage={canManage} maxYears={maxYears} />
    </>
  );
}
