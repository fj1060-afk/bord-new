import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { can, LEVELS } from "@/lib/permissions";
import { ScopeResolutions } from "../../_scope/lists";
import { activeBoard, NoBoard } from "../_parts/board";

export const metadata: Metadata = { title: "قرارات المجلس" };

export default async function BoardResolutionsPage() {
  const viewer = await requirePage("/resolutions");
  const board = await activeBoard();
  if (!board) return <NoBoard canManage={can(viewer.permissions, "/board", LEVELS.manage)} />;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="قرارات المجلس" />
      <ScopeResolutions scope={{ board: board.id }} />
    </>
  );
}
