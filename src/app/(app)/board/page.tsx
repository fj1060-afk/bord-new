import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { formatGregorianDate } from "@/lib/format";
import { can, LEVELS } from "@/lib/permissions";
import { activeBoard, NoBoard } from "./_parts/board";
import { BoardOverview } from "./_parts/overview";

export const metadata: Metadata = { title: "لوحة المجلس" };

export default async function BoardPage() {
  const viewer = await requirePage("/board");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title={board.name} description={`الدورة من ${formatGregorianDate(new Date(board.term_start))} إلى ${formatGregorianDate(new Date(board.term_end))}`} />
      <BoardOverview board={board} canEdit={can(viewer.permissions, "/board", LEVELS.edit)} />
    </>
  );
}
