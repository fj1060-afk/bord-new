import { cache } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { companyProfile } from "@/lib/live-server";
import { createClient } from "@/lib/supabase/server";
import { BoardForm } from "../board-forms";

export type Board = { id: string; name: string; term_start: string; term_end: string };

/** The current board, once per request. */
export const activeBoard = cache(async (): Promise<Board | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("boards").select("id, name, term_start, term_end").eq("status", "active").order("term_start", { ascending: false }).limit(1).maybeSingle();
  return data;
});

/** Shown on every board page until the board exists. */
export async function NoBoard({ canManage }: { canManage: boolean }) {
  const maxYears = (await companyProfile(await createClient()))?.max_term_years ?? 4;
  return (
    <>
      <PageHeader section="مجلس الإدارة" title="مجلس الإدارة" />
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
