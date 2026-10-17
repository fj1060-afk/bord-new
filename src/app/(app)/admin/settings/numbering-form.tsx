"use client";

import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { compactInputClass, inputWith } from "@/components/ui/styles";
import { SwitchRow } from "@/components/ui/switch";
import { meetingCode, type NumberingFormat } from "@/lib/meetings";
import { saveNumbering } from "./actions";

export type Body = { key: string; name: string; code: string };

const SEPARATORS = [
  ["-", "شرطة  -"],
  ["/", "شرطة مائلة  /"],
  [".", "نقطة  ."],
  ["_", "شرطة سفلية  _"],
] as const;

/** How meetings are numbered: one code per board and committee, the separator, digits and year, with a live preview. */
export function NumberingForm({ format, bodies, year, canManage }: { format: NumberingFormat; bodies: Body[]; year: number; canManage: boolean }) {
  const [state, action] = useActionState(saveNumbering, null);
  const [f, setF] = useState(format);
  const [codes, setCodes] = useState(() => Object.fromEntries(bodies.map((b) => [b.key, b.code])));
  const [pick, setPick] = useState(bodies[0]?.key ?? "");
  const [sampleYear, setSampleYear] = useState(year);
  const [seq, setSeq] = useState(1);
  const [copied, setCopied] = useState(false);
  const code = (key: string) => codes[key] || "—";
  const result = meetingCode(code(pick), sampleYear, Math.max(1, seq), f);
  const off = !canManage;

  return (
    <ActionForm action={action} state={state} className="mb-10">
      <fieldset disabled={off} className="flex flex-col gap-4 rounded-lg border border-rule bg-surface px-5 py-4">
        <legend className="px-1 font-display text-lg font-bold">ترقيم الاجتماعات</legend>
        <p className="text-xs leading-6 text-ink-muted">
          يُنشأ الرقم تلقائياً عند إصدار الدعوة، ولا يتغير بعدها حتى لو تغير موعد الاجتماع أو هذه الإعدادات. لكل جهة تسلسل مستقل يبدأ من جديد مع كل سنة، والاجتماع الملغى يحتفظ برقمه. الاجتماع غير العادي يُميَّز بحقل «نوع الاجتماع» دون تغيير صيغة الرقم.
        </p>

        <div className="flex flex-col items-center gap-3 rounded-lg bg-paper p-4">
          <div className="flex flex-wrap items-end justify-center gap-3 text-xs">
            <label className="flex flex-col gap-1">
              الجهة
              <select value={pick} onChange={(e) => setPick(e.target.value)} className={compactInputClass}>
                {bodies.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              السنة
              <input type="number" value={sampleYear} min={2000} max={2100} onChange={(e) => setSampleYear(Number(e.target.value) || year)} className={inputWith("w-24 font-mono")} dir="ltr" />
            </label>
            <label className="flex flex-col gap-1">
              التسلسل
              <input type="number" value={seq} min={1} max={99999} onChange={(e) => setSeq(Number(e.target.value) || 1)} className={inputWith("w-20 font-mono")} dir="ltr" />
            </label>
          </div>
          <span className="text-xs text-ink-muted">رقم الاجتماع الناتج</span>
          <output dir="ltr" className="font-mono text-3xl font-bold tracking-wide text-primary">
            {result}
          </output>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(result).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="motion-press inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-1 text-xs hover:border-primary"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? "نُسخ" : "نسخ الرقم"}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-4 text-sm">
          <label className="flex flex-col gap-1 text-xs">
            الفاصل
            <select name="separator" value={f.separator} onChange={(e) => setF({ ...f, separator: e.target.value })} className={compactInputClass}>
              {SEPARATORS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            خانات التسلسل
            <select name="digits" value={f.digits} onChange={(e) => setF({ ...f, digits: Number(e.target.value) })} className={compactInputClass}>
              {[2, 3, 4].map((d) => (
                <option key={d} value={d}>
                  {d} ({"0".repeat(d - 1)}1)
                </option>
              ))}
            </select>
          </label>
          <div className="min-w-56 flex-1">
            <SwitchRow name="with_year" label="إظهار السنة في الرقم" checked={f.withYear} onChange={(e) => setF({ ...f, withYear: e.target.checked })} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-rule">
          <table className="w-full text-sm">
            <thead className="bg-paper text-ink-muted">
              <tr>
                <th className="px-4 py-2 text-start font-medium">الجهة</th>
                <th className="px-4 py-2 text-start font-medium">الرمز</th>
                <th className="px-4 py-2 text-start font-medium">مثال رقم الاجتماع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {bodies.map((b) => (
                <tr key={b.key}>
                  <td className="px-4 py-2">{b.name}</td>
                  <td className="px-4 py-2">
                    <input
                      name={`code:${b.key}`}
                      value={codes[b.key] ?? ""}
                      onChange={(e) => setCodes({ ...codes, [b.key]: e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) })}
                      required
                      dir="ltr"
                      aria-label={`رمز ${b.name}`}
                      className={inputWith("w-24 font-mono uppercase")}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono" dir="ltr">
                    {meetingCode(code(b.key), year, 1, f)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink-muted">الرمز من حرف إلى ستة أحرف إنجليزية، ولا يتكرر بين الجهات. هذا ترقيم تنظيمي داخلي تعدّله حسب تسلسل الشركة، وليس صيغة إلزامية.</p>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="جارٍ الحفظ…" className="w-fit">
            حفظ إعدادات الترقيم
          </SubmitButton>
          <FormMessage state={state} />
        </div>
      </fieldset>
    </ActionForm>
  );
}
