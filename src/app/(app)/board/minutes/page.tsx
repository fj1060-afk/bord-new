import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { ScopeMinutes } from "../../_scope/lists";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "محاضر المجلس" };

export default async function BoardMinutesPage() {
  const viewer = await requirePage("/minutes");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="محاضر المجلس" />
      <ScopeMinutes scope={{ board: board.id }} />
    </>
  );
}
