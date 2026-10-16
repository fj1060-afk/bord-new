import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { ScopeDocuments } from "../../_scope/lists";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "مستندات المجلس" };

export default async function BoardDocumentsPage() {
  const viewer = await requirePage("/documents");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="مستندات المجلس" />
      <ScopeDocuments scope={{ board: board.id }} />
    </>
  );
}
