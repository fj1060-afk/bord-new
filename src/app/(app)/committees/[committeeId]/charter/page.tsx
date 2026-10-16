import type { Metadata } from "next";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { committeeRules, compositionChecks, POWER_KINDS } from "@/lib/committee-powers";
import { companyProfile } from "@/lib/live-server";
import { createClient } from "@/lib/supabase/server";
import { Panel } from "../../../_dashboard/widgets";
import { committeeOf, compositionMembers } from "../../_committee";

export const metadata: Metadata = { title: "اللائحة والصلاحيات" };

const Guide = ({ on, listed }: { on?: true; listed: boolean }) =>
  on || !listed ? <span className="ms-1 rounded border border-rule px-1 text-xs text-ink-muted">إرشادي</span> : null;

/** A committee's statutory layer: competencies by nature, composition and meeting rules, and who issues its charter. */
export default async function CommitteeCharterPage({ params }: PageProps<"/committees/[committeeId]/charter">) {
  await requirePage("/committees");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  const [rules, members, profile] = [committeeRules(committee.kind), await compositionMembers(committeeId), await companyProfile(await createClient())];
  const listed = profile?.company_type === "listed_jsc";

  return (
    <>
      <PageHeader section={committee.name} title="اللائحة والصلاحيات" description="الاختصاصات النظامية للجنة وشروط تشكيلها واجتماعاتها، من لائحة حوكمة الشركات الصادرة عن هيئة السوق المالية." />
      {!rules ? (
        <p className="rounded-lg border border-dashed border-rule bg-surface p-6 text-sm leading-7 text-ink-muted">
          لا تحدد الأنظمة اختصاصات لهذا النوع من اللجان؛ صلاحياتها كلها من قرار المجلس بتشكيلها ولائحة عملها (لائحة الحوكمة م47/2). حدّد نوع اللجنة من «الأعضاء ← تعديل اللجنة» إن كانت مراجعة أو مكافآت أو ترشيحات أو مخاطر.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {!listed && <p className="rounded-md bg-brass-soft p-3 text-sm">الشركة غير مدرجة: هذه الأحكام إرشادية لها، وتُلزمها بقدر ما تتبناه في لائحة اللجنة ونظامها الأساس.</p>}
          <Panel title="الاختصاصات النظامية">
            <ul className="divide-y divide-rule text-sm">
              {rules.powers.map((p) => (
                <li key={p.ref + p.ar} className="flex items-start gap-3 px-5 py-3">
                  <span className={clsx("mt-1 shrink-0 rounded-full px-2 py-0.5 text-xs", p.kind === "decide" ? "bg-primary-soft text-primary" : p.kind === "recommend" ? "bg-brass-soft text-brass" : "bg-paper text-ink-muted")}>{POWER_KINDS[p.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block leading-7">{p.ar}</span>
                    <span className="block text-[11px] text-ink-muted">
                      {p.ref}
                      <Guide on={p.guiding} listed={listed} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-rule px-5 py-3 text-xs text-ink-muted">ما تقرره اللجنة يُعتمد في اجتماعها؛ وما توصي به يُرفع للمجلس ليقرر. يراجع النظام بنود اجتماعات اللجنة على هذا الأساس.</p>
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="التشكيل الحالي">
              <ul className="divide-y divide-rule text-sm">
                {compositionChecks(committee.kind, members).map((c) => (
                  <li key={c.ref + c.ar} className="flex items-start gap-3 px-5 py-3">
                    <span className={clsx("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs", c.ok ? "bg-primary-soft text-primary" : c.guiding || !listed ? "bg-brass-soft text-brass" : "bg-danger/10 text-danger")}>{c.ok ? "مستوفى" : c.guiding || !listed ? "تنبيه" : "مخالفة"}</span>
                    <span className="min-w-0 flex-1">{c.ar}</span>
                    <span className="text-xs text-ink-muted">{c.ref}</span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-rule px-5 py-3 text-xs text-ink-muted">صفة العضو (مستقل أو تنفيذي) تُعرف من عضويته في المجلس؛ ويُتحقق يدوياً من الشروط التي لا يعرفها النظام.</p>
            </Panel>
            <Panel title="شروط التشكيل والاجتماعات">
              <ul className="divide-y divide-rule text-sm">
                {rules.composition.map((r) => (
                  <li key={r.ref + r.ar} className="flex items-start justify-between gap-3 px-5 py-3">
                    <span className="leading-7">{r.ar}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {r.ref}
                      <Guide on={r.guiding} listed={listed} />
                    </span>
                  </li>
                ))}
                {rules.minMeetings && (
                  <li className="flex items-start justify-between gap-3 px-5 py-3">
                    <span>{rules.minMeetings.perYear === 1 ? "تجتمع مرة في السنة على الأقل" : rules.minMeetings.perYear === 2 ? "تجتمع كل ستة أشهر على الأقل" : `تجتمع ${rules.minMeetings.perYear} مرات في السنة المالية على الأقل`}</span>
                    <span className="shrink-0 text-xs text-ink-muted">
                      {rules.minMeetings.ref}
                      <Guide on={rules.minMeetings.guiding} listed={listed} />
                    </span>
                  </li>
                )}
                <li className="flex items-start justify-between gap-3 px-5 py-3">
                  <span>تصدر لائحة عمل اللجنة من: {rules.charterBy.ar}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{rules.charterBy.ref}</span>
                </li>
              </ul>
            </Panel>
          </div>
          <p className="text-xs text-ink-muted">النصوص مصاغة من الترجمة الرسمية للائحة حوكمة الشركات، والنص العربي المنشور هو المرجع. لائحة عمل اللجنة الداخلية وتفويضات المجلس تُضاف في مرحلة تالية.</p>
        </div>
      )}
    </>
  );
}
