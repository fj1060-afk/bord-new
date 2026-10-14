import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { PhaseStatusTag } from "@/components/ui/phase-tag";
import { phases } from "@/config/phases";

// Until the dashboard is built (phase 6), the home page tracks the build itself.
export default function HomePage() {
  return (
    <>
      <PageHeader
        section="الرئيسية"
        title="خطة بناء المنصة"
        description="تُبنى المنصة على مراحل، وكل مرحلة تُسلَّم كاملة ومختبرة قبل بدء التي تليها."
      />
      <ol className="relative flex flex-col gap-3">
        {phases.map((phase) => (
          <li
            key={phase.number}
            className={clsx(
              "grid grid-cols-[3rem_1fr] gap-4 rounded-lg border bg-surface p-5 sm:grid-cols-[3.5rem_1fr]",
              phase.status === "active" ? "border-brass" : "border-rule",
            )}
          >
            <span
              className={clsx(
                "flex size-10 items-center justify-center rounded-full border font-mono text-sm sm:size-12",
                phase.status === "active"
                  ? "border-brass text-brass"
                  : "border-rule text-ink-muted",
              )}
              aria-label={`المرحلة ${phase.number}`}
            >
              {phase.number}
            </span>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-3">
                <h2 className="font-display text-lg font-bold">{phase.title}</h2>
                <PhaseStatusTag status={phase.status} />
              </div>
              <p className="text-sm text-ink-muted">{phase.scope}</p>
              <p className="mt-2 text-sm">
                <span className="text-ink-muted">تكتمل عندما: </span>
                {phase.doneWhen}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
