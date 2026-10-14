import Link from "next/link";
import clsx from "clsx";
import { Meter, Panel, StatTile } from "../_dashboard/widgets";
import { score, SOURCES, type Finding, type Status } from "@/lib/compliance";
import { complianceFindings } from "@/lib/compliance-server";
import { COMPANY_TYPES } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import type { Supabase } from "./_data";

const STATUS: Record<Status, { label: string; className: string }> = {
  violation: { label: "مخالفة", className: "bg-danger/10 text-danger" },
  warning: { label: "تنبيه", className: "bg-brass-soft text-brass" },
  ok: { label: "ملتزم", className: "bg-primary-soft text-primary" },
};
const ORDER: Status[] = ["violation", "warning", "ok"];

function Row({ f }: { f: Finding }) {
  return (
    <li>
      <Link href={f.href} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-paper">
        <span className={clsx("rounded-full px-2 py-0.5 text-xs", STATUS[f.status].className)}>{STATUS[f.status].label}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{f.title}</span>
          <span className="block text-xs text-ink-muted">{f.detail}</span>
        </span>
        <span className="text-xs text-ink-muted">
          {SOURCES[f.source]} · {f.article}
          {f.level === "guidance" && <span className="ms-1 rounded border border-rule px-1">إرشادي</span>}
        </span>
      </Link>
    </li>
  );
}

export async function ComplianceTab({ supabase }: { supabase: Supabase }) {
  const [findings, profile] = await Promise.all([complianceFindings(supabase), companyProfile(supabase)]);
  if (!findings || !profile) return <p className="text-sm text-ink-muted">أكمل ملف الشركة أولاً.</p>;
  const pct = score(findings);
  const count = (s: Status) => findings.filter((f) => f.status === s).length;
  const sorted = [...findings].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.level === "mandatory" ? -1 : 1));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="نسبة الامتثال" value={pct === null ? "—" : `${pct}%`} note="من القواعد الإلزامية" tone={count("violation") ? "alert" : "default"} />
        <StatTile label="مخالفات" value={count("violation")} tone={count("violation") ? "alert" : "default"} />
        <StatTile label="تنبيهات" value={count("warning")} />
        <StatTile label="نوع الشركة" value={<span className="font-sans text-lg">{COMPANY_TYPES[profile.company_type]}</span>} href="/admin/company" />
      </div>
      {pct !== null && <Meter percent={pct} label={`نسبة الامتثال ${pct}%`} />}
      <Panel title="القواعد">
        <ul className="divide-y divide-rule">
          {sorted.map((f) => (
            <Row key={f.id} f={f} />
          ))}
        </ul>
      </Panel>
      <p className="text-xs text-ink-muted">
        القواعد مستخلصة من نظام الشركات ولائحة حوكمة الشركات والدليل الاسترشادي لأمين السر، وتُطبّق حسب نوع الشركة: ما لا يلزمها يظهر «إرشادياً» ولا يُحتسب مخالفة. النظام أداة مساعدة، والمرجع النصوص الرسمية المنشورة.
      </p>
    </div>
  );
}
