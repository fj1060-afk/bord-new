"use client";

import { useActionState, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Collapse } from "@/components/ui/collapse";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { BOARD_CATEGORIES, BOARD_POSITIONS, COMMITTEE_POSITIONS } from "@/lib/org";
import type { UserItem } from "./page";
import { updatePositions } from "./positions-actions";

/** «المنصب»: the user's seat on the board and in each committee; the only place positions change. */
export function PositionsForm({ user, committees }: { user: UserItem; committees: { id: string; name: string }[] }) {
  const [state, action] = useActionState(updatePositions.bind(null, user.id), null);
  const [board, setBoard] = useState(user.seats.board?.position ?? "");
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-4">
      <p className="text-xs leading-6 text-ink-muted">المناصب في المجلس واللجان تُحدَّد هنا فقط، وتظهر منها في المحاضر والدعوات والنصاب. إزالة المنصب تُنهي العضوية بتاريخ اليوم ويبقى سجلها.</p>
      <fieldset className="flex flex-col gap-3 rounded-lg border border-rule p-3">
        <legend className="px-1 text-sm font-medium">مجلس الإدارة</legend>
        <Field label="المنصب">
          <select name="board_position" value={board} onChange={(e) => setBoard(e.target.value)} className={inputClass}>
            <option value="">ليس عضواً في المجلس</option>
            {Object.entries(BOARD_POSITIONS).map(([v, l]) => (
              <option key={v} value={v}>
                {v === "member" ? "عضو مجلس الإدارة" : l}
              </option>
            ))}
          </select>
        </Field>
        <Collapse show={board !== ""}>
          <Field label="الصفة">
            <select name="board_category" defaultValue={user.seats.board?.category ?? "non_executive"} className={inputClass}>
              {Object.entries(BOARD_CATEGORIES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </Collapse>
      </fieldset>
      {committees.length > 0 && (
        <fieldset className="flex flex-col gap-3 rounded-lg border border-rule p-3">
          <legend className="px-1 text-sm font-medium">اللجان</legend>
          {committees.map((c) => (
            <Field key={c.id} label={c.name}>
              <select name={`committee:${c.id}`} defaultValue={user.seats.committees[c.id] ?? ""} className={inputClass}>
                <option value="">ليس عضواً</option>
                {Object.entries(COMMITTEE_POSITIONS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          ))}
        </fieldset>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ المناصب</SubmitButton>
    </ActionForm>
  );
}

/** The user's positions in words, e.g. "رئيس مجلس الإدارة · رئيس لجنة المراجعة". */
export function positionsText(user: UserItem, committees: { id: string; name: string }[]): string {
  const board = user.seats.board ? (user.seats.board.position === "chair" ? "رئيس مجلس الإدارة" : user.seats.board.position === "vice_chair" ? "نائب رئيس مجلس الإدارة" : "عضو مجلس الإدارة") : null;
  const role = { chair: "رئيس", member: "عضو", secretary: "أمين" } as Record<string, string>;
  const inCommittees = committees.filter((c) => user.seats.committees[c.id]).map((c) => `${role[user.seats.committees[c.id]] ?? "عضو"} ${c.name}`);
  return [board, ...inCommittees].filter(Boolean).join(" · ");
}
