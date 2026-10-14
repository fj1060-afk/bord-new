import { Download, Eye, Printer } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";

const DOCS = [
  { key: "agenda", label: "الدعوة وجدول الأعمال" },
  { key: "attendance", label: "كشف الحضور" },
  { key: "minutes", label: "محضر الاجتماع" },
] as const;

/** The meeting's printable documents: preview, print or download each as PDF. */
export function PrintDocs({ meetingId, hasMinutes }: { meetingId: string; hasMinutes: boolean }) {
  const link = "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary-soft";
  return (
    <section className="rounded-lg border border-rule bg-surface">
      <h2 className="border-b border-rule px-5 py-3 font-display text-lg font-bold">المستندات المطبوعة</h2>
      <ul className="divide-y divide-rule text-sm">
        {DOCS.map((d) => {
          const href = `/print/meetings/${meetingId}/${d.key}`;
          const available = d.key !== "minutes" || hasMinutes;
          return (
            <li key={d.key} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
              <span>{d.label}</span>
              {available ? (
                <span className="flex gap-1">
                  <a href={href} target="_blank" className={link}>
                    <Eye size={14} aria-hidden="true" /> معاينة
                  </a>
                  <a href={`${href}?do=print`} target="_blank" className={link}>
                    <Printer size={14} aria-hidden="true" /> طباعة
                  </a>
                  <a href={`${href}?do=pdf`} target="_blank" className={buttonClass("secondary", "px-2 py-1 text-xs")}>
                    <Download size={14} aria-hidden="true" /> PDF
                  </a>
                </span>
              ) : (
                <span className="text-xs text-ink-muted">بعد إعداد المحضر</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
