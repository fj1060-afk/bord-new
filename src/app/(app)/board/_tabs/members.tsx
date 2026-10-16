import Link from "next/link";
import { buttonClass } from "@/components/ui/styles";
import { ConfirmButton } from "@/components/org/confirm-button";
import { formatGregorianDate } from "@/lib/format";
import { BOARD_CATEGORIES, BOARD_POSITIONS, currentYear, sortByPosition } from "@/lib/org";
import { listPeople } from "@/lib/people";
import { Executives } from "../executives";
import { createClient } from "@/lib/supabase/server";
import { endBoardMembership } from "../actions";
import { AddBoardMemberForm, BoardForm } from "../board-forms";

type MemberRow = {
  id: string;
  position: keyof typeof BOARD_POSITIONS;
  category: keyof typeof BOARD_CATEGORIES;
  start_date: string;
  person: { id: string; full_name: string; job_title: string | null; disclosures: { year: number }[] };
};

/** Members: composition, registration, the executive team and the board's own details. */
export async function BoardMembers({ board, canEdit, canManage, maxYears }: { board: { id: string; name: string; term_start: string; term_end: string }; canEdit: boolean; canManage: boolean; maxYears: number }) {
  const supabase = await createClient();
  const year = currentYear();
  const [{ data: rows }, people] = await Promise.all([
    supabase
      .from("board_members")
      .select("id, position, category, start_date, person:people(id, full_name, job_title, disclosures(year))")
      .eq("board_id", board.id)
      .eq("status", "active"),
    canEdit ? listPeople(supabase) : Promise.resolve([]),
  ]);
  const members = sortByPosition(
    ((rows ?? []) as unknown as MemberRow[]).map((m) => ({ ...m, name: m.person.full_name })),
  );
  const independent = members.filter((m) => m.category === "independent").length;

  return (
    <>

      <dl className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["الأعضاء", members.length],
          ["المستقلون", independent],
          ...(canEdit ? [[`إفصاحات ${year}`, `${members.filter((m) => m.person.disclosures.some((d) => d.year === year)).length} من ${members.length}`]] : []),
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-rule bg-surface p-4">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd className="mt-1 font-mono text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      {canEdit && (
        <div className="mb-6 flex flex-col gap-3">
          <Link href="/board/members/new" className={buttonClass("primary", "w-fit")}>
            تسجيل عضو جديد
          </Link>
          <AddBoardMemberForm boardId={board.id} people={people} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-rule bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-paper text-ink-muted">
            <tr>
              <th className="px-4 py-2.5 text-start font-medium">العضو</th>
              <th className="px-4 py-2.5 text-start font-medium">المنصب</th>
              <th className="px-4 py-2.5 text-start font-medium">الصفة</th>
              <th className="px-4 py-2.5 text-start font-medium">منذ</th>
              {canEdit && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-ink-muted">
                  لا يوجد أعضاء بعد.
                </td>
              </tr>
            )}
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3">
                  <Link href={`/people/${m.person.id}`} className="font-medium text-primary hover:underline">
                    {m.person.full_name}
                  </Link>
                  {m.person.job_title && <span className="block text-xs text-ink-muted">{m.person.job_title}</span>}
                </td>
                <td className="px-4 py-3">{BOARD_POSITIONS[m.position]}</td>
                <td className="px-4 py-3">{BOARD_CATEGORIES[m.category]}</td>
                <td className="px-4 py-3 text-ink-muted">{formatGregorianDate(new Date(m.start_date))}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-end">
                    <ConfirmButton
                      action={endBoardMembership.bind(null, m.id)}
                      label="إنهاء العضوية"
                      confirm={`إنهاء عضوية ${m.person.full_name} اليوم؟`}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Executives year={year} canEdit={canEdit} people={people} />

      {canManage && (
        <details className="mt-8 rounded-lg border border-rule bg-surface">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">تعديل بيانات المجلس ودورته</summary>
          <div className="border-t border-rule p-5">
            <BoardForm board={board} maxYears={maxYears} />
          </div>
        </details>
      )}
    </>
  );
}
