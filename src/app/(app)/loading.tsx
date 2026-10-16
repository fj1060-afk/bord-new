// Shown instantly while a page's data loads, so navigation never looks frozen.
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="appear-late">
      <div className="animate-pulse">
        <span className="sr-only">جارٍ التحميل…</span>
        <div className="mb-2 h-4 w-24 rounded bg-rule" />
        <div className="mb-3 h-8 w-64 rounded bg-rule" />
        <div className="mb-8 h-4 w-96 max-w-full rounded bg-rule/70" />
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-rule bg-surface"
            />
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-5 rounded bg-rule/60"
              style={{ width: `${90 - i * 12}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
