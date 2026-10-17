import { Download, Eye, FileText, Printer, Users } from "lucide-react";
import { Card } from "./overview-cards";

const DOCS = [
  { key: "agenda", label: "الدعوة وجدول الأعمال", icon: FileText },
  { key: "attendance", label: "كشف الحضور", icon: Users },
  { key: "minutes", label: "محضر الاجتماع", icon: FileText },
] as const;

const pill = "motion-press inline-flex items-center gap-1.5 rounded-md border border-rule px-2.5 py-1.5 text-xs hover:border-primary";

/** The meeting's printable documents: preview, print or download each as PDF. */
export function PrintDocs({ meetingId, hasMinutes }: { meetingId: string; hasMinutes: boolean }) {
  return (
    <Card title="المستندات المطبوعة">
      <ul className="divide-y divide-rule overflow-hidden rounded-lg border border-rule text-sm">
        {DOCS.map((d) => {
          const href = `/print/meetings/${meetingId}/${d.key}`;
          const available = d.key !== "minutes" || hasMinutes;
          const Icon = d.icon;
          return (
            <li key={d.key} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1 basis-40 font-medium">{d.label}</span>
              {available ? (
                <span className="flex gap-1.5">
                  <a href={href} target="_blank" className={`${pill} text-primary`}>
                    <Eye size={14} aria-hidden="true" /> معاينة
                  </a>
                  <a href={`${href}?do=print`} target="_blank" className={`${pill} text-primary`}>
                    <Printer size={14} aria-hidden="true" /> طباعة
                  </a>
                  <a href={`${href}?do=pdf`} target="_blank" className={pill}>
                    <Download size={14} aria-hidden="true" /> PDF
                  </a>
                </span>
              ) : (
                <span className="rounded-md border border-rule px-2.5 py-1.5 text-xs text-ink-muted">بعد إعداد المحضر</span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
