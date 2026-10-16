"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ConfirmButton } from "@/components/org/confirm-button";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { DECLARATIONS, INDEPENDENCE_ISSUES, type DeclarationKind } from "@/lib/declarations";
import { fileDeclaration, reviewDeclaration } from "./actions";

export type Declaration = { id: string; kind: DeclarationKind; year: number; flagged: boolean; details: string | null; data: { issues?: number[]; seats?: string[]; type?: string; eventDate?: string }; status: "submitted" | "reviewed"; submitted_at: string };

function CompetitionForm({ personId }: { personId: string }) {
  const [state, action] = useActionState(fileDeclaration.bind(null, personId, "competition"), null);
  const [yes, setYes] = useState(false);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-3 text-sm">
      <p>هل يشترك العضو في عمل ينافس الشركة أو أحد فروع نشاطها؟ لا يجوز ذلك إلا بترخيص من الجمعية العامة.</p>
      <label className="flex items-center gap-2">
        <input type="radio" name="flagged" value="no" checked={!yes} onChange={() => setYes(false)} /> لا
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="flagged" value="yes" checked={yes} onChange={() => setYes(true)} /> نعم
      </label>
      {yes && (
        <Field label="العمل المنافس" hint="الجهة، وطبيعة النشاط، وترخيص الجمعية إن وُجد.">
          <textarea name="details" rows={3} required className={inputClass} />
        </Field>
      )}
      <FormMessage state={state} />
      <SubmitButton className="w-fit">تقديم الإقرار</SubmitButton>
    </ActionForm>
  );
}

function IndependenceForm({ personId }: { personId: string }) {
  const [state, action] = useActionState(fileDeclaration.bind(null, personId, "independence"), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-3 text-sm">
      <p>حدّد ما ينطبق على العضو؛ أيٌّ منها ينفي صفة الاستقلال. إن لم ينطبق شيء فقدّم الإقرار دون تحديد.</p>
      {INDEPENDENCE_ISSUES.map((issue, i) => (
        <label key={i} className="flex items-start gap-2 leading-6">
          <input type="checkbox" name="issue" value={i} className="mt-1.5" /> {issue}
        </label>
      ))}
      <Field label="ملاحظات (اختياري)">
        <textarea name="details" rows={2} className={inputClass} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="w-fit">تقديم الإقرار</SubmitButton>
    </ActionForm>
  );
}

function OtherBoardsForm({ personId, seats }: { personId: string; seats: string[] }) {
  const [state, action] = useActionState(fileDeclaration.bind(null, personId, "other_boards"), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-3 text-sm">
      <p>العضويات الحالية في مجالس الإدارة بحسب السيرة الذاتية. حدّث السيرة إن كانت ناقصة، ثم أقرّ بصحتها.</p>
      <ul className="list-disc ps-5">{seats.length ? seats.map((s) => <li key={s}>{s}</li>) : <li>لا عضويات أخرى.</li>}</ul>
      <input type="hidden" name="seats" value={seats.join("\n")} />
      <FormMessage state={state} />
      <SubmitButton className="w-fit">أقرّ بصحتها</SubmitButton>
    </ActionForm>
  );
}

const summary = (d: Declaration) =>
  d.kind === "competition"
    ? d.flagged ? "يشترك في عمل منافس" : "لا يشترك في عمل منافس"
    : d.kind === "independence"
      ? d.flagged ? `ينطبق ${d.data.issues?.length ?? 0} مما ينفي الاستقلال` : "لا ينطبق ما ينفي الاستقلال"
      : d.kind === "other_boards"
        ? `${d.data.seats?.length ?? 0} عضوية في مجالس أخرى`
        : `${d.data.type === "change" ? "تغيير المصلحة" : "ملكية 5% أو أكثر"} · ${d.data.eventDate ?? ""}`;

/** This year's declarations: each kind once a year (the ownership notice per event), with review by board editors. */
export function Declarations({ personId, year, items, independent, seats, canFile, canReview }: { personId: string; year: number; items: Declaration[]; independent: boolean; seats: string[]; canFile: boolean; canReview: boolean }) {
  const filed = (k: DeclarationKind) => items.some((d) => d.kind === k && d.year === year);
  const due: DeclarationKind[] = (["competition", ...(independent ? (["independence"] as const) : []), "other_boards"] as DeclarationKind[]).filter((k) => !filed(k));
  return (
    <div className="flex flex-col gap-3">
      {canFile &&
        due.map((k) => (
          <details key={k} className="rounded-lg border border-brass bg-surface p-4">
            <summary className="cursor-pointer text-sm font-medium">
              {DECLARATIONS[k].label} <span className="font-mono">{year}</span>
              <span className="block text-xs text-ink-muted">{DECLARATIONS[k].ref}</span>
            </summary>
            <div className="mt-3">
              {k === "competition" && <CompetitionForm personId={personId} />}
              {k === "independence" && <IndependenceForm personId={personId} />}
              {k === "other_boards" && <OtherBoardsForm personId={personId} seats={seats} />}
            </div>
          </details>
        ))}
      {canFile && (
        <Link href={`/people/${personId}/ownership`} className={buttonClass("secondary", "w-fit")}>
          إشعار ملكية 5% أو تغيّرها
        </Link>
      )}
      <ul className="flex flex-col gap-2">
        {items.map((d) => (
          <li key={d.id} className="rounded-lg border border-rule bg-surface p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <strong>{DECLARATIONS[d.kind].label}</strong>
              <span className={d.status === "reviewed" ? "text-xs text-primary" : "text-xs text-brass"}>{d.status === "reviewed" ? "تمت المراجعة" : "بانتظار المراجعة"}</span>
            </div>
            <p className={d.flagged && d.kind !== "ownership_notice" ? "text-danger" : "text-ink-muted"}>
              <span className="font-mono">{d.year}</span> · {summary(d)}
            </p>
            {d.details && <p className="mt-1 whitespace-pre-line text-xs text-ink-muted">{d.details}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              {d.kind === "ownership_notice" && (
                <a href={`/print/ownership/${d.id}`} target="_blank" className="text-xs text-primary hover:underline">
                  النموذج للطباعة والتوقيع
                </a>
              )}
              {canReview && d.status !== "reviewed" && <ConfirmButton action={reviewDeclaration.bind(null, personId, d.id)} label="اعتماد المراجعة" variant="secondary" confirm="اعتماد مراجعة هذا الإقرار؟" />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
