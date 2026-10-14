import type { ReactNode } from "react";

export function PageHeader({
  section,
  title,
  description,
  actions,
}: {
  section: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
      <div className="min-w-0">
        <p className="mb-1 text-sm text-brass">{section}</p>
        <h1 className="font-display text-3xl font-bold leading-snug text-ink">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-ink-muted">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
