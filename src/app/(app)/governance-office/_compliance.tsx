import Link from "next/link";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";
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
      <Link href={f.href} className="group flex items-start gap-3 px-5 py-4 text-sm hover:bg-paper">
        <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-xs", STATUS[f.status].className)}>{STATUS[f.status].label}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{f.title}</span>
          <span className="mt-1 block text-xs leading-6 text-ink-muted">{f.detail}</span>
          <span className="mt-1 block text-[11px] text-ink-muted/80">
            {SOURCES[f.source]} · {f.article}
            {f.level === "guidance" && <span className="ms-1 rounded border border-rule px-1">إرشادي</span>}
          </span>
        </span>
        <ChevronLeft size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:-translate-x-0.5" />
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
      <div className="motion-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
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
