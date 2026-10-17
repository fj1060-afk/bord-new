import type { ReactNode } from "react";
import { ChevronDown, Link2, Pencil, type LucideIcon } from "lucide-react";

export type Tile = { icon: LucideIcon; label: string; value: string };

/** A titled card with an optional icon and action on the title row. */
export function Card({ title, icon: Icon, action, children }: { title: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-rule bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-primary" />}
        <h2 className="min-w-0 flex-1 font-display text-lg font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The meeting's facts as icon tiles; «تعديل» on the title row unfolds the edit form above them. */
export function MeetingDetailsCard({ tiles, link, editForm }: { tiles: Tile[]; link?: string | null; editForm?: ReactNode }) {
  const grid = (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule">
      {tiles.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-2.5 bg-surface p-3 sm:p-4">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
          <div className="min-w-0">
            <dt className="text-xs text-ink-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-bold">{value}</dd>
          </div>
        </div>
      ))}
      {link && (
        <div className="col-span-2 flex items-start gap-2.5 bg-surface p-3 sm:p-4">
          <Link2 size={20} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted" />
          <div className="min-w-0">
            <dt className="text-xs text-ink-muted">رابط الاجتماع</dt>
            <dd className="mt-0.5 truncate text-sm">
              <a href={link} target="_blank" rel="noreferrer" dir="ltr" className="text-primary hover:underline">
                {link}
              </a>
            </dd>
          </div>
        </div>
      )}
    </dl>
  );
  if (!editForm) return <Card title="بيانات الاجتماع">{grid}</Card>;
  return (
    <section className="rounded-xl border border-rule bg-surface p-4 sm:p-5">
      <details id="meeting-details" className="group/edit scroll-mt-24">
        <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
          <h2 className="min-w-0 flex-1 font-display text-lg font-bold">بيانات الاجتماع</h2>
          <span className="motion-press inline-flex items-center gap-1.5 rounded-md border border-rule px-3 py-1.5 text-xs hover:border-primary">
            <Pencil size={14} aria-hidden="true" className="group-open/edit:hidden" />
            <ChevronDown size={14} aria-hidden="true" className="hidden rotate-180 group-open/edit:block" />
            <span className="group-open/edit:hidden">تعديل</span>
            <span className="hidden group-open/edit:inline">إغلاق</span>
          </span>
        </summary>
        <div className="mt-3 rounded-lg border border-rule p-4">{editForm}</div>
      </details>
      <div className="mt-3">{grid}</div>
    </section>
  );
}
