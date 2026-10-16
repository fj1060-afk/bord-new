import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { ScopeMeetings } from "../../_scope/lists";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "اجتماعات المجلس" };

export default async function BoardMeetingsPage() {
  const viewer = await requirePage("/meetings");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="اجتماعات المجلس" />
      <ScopeMeetings scope={{ board: board.id }} canEdit={can(viewer.permissions, "/meetings", LEVELS.edit)} />
    </>
  );
}
