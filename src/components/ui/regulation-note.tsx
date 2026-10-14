import { BookOpenCheck } from "lucide-react";
import type { Note } from "@/lib/regulations";

/** A collapsible list of the articles that apply to the page. */
export function RegulationNote({ notes }: { notes: Note[] }) {
  return (
    <details className="mb-6 rounded-lg border border-brass/30 bg-brass-soft/30 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 font-medium text-brass">
        <BookOpenCheck size={16} aria-hidden="true" />
        ما تقوله الأنظمة
      </summary>
      <ul className="flex flex-col gap-2 border-t border-brass/20 px-4 py-3">
        {notes.map((n) => (
          <li key={n.article + n.text}>
            {n.text} <span className="text-xs text-ink-muted">({n.source} {n.article})</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
