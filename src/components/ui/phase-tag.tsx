import clsx from "clsx";
import type { PhaseStatus } from "@/config/phases";

const labels: Record<PhaseStatus, string> = {
  done: "مكتملة",
  active: "قيد البناء",
  planned: "لم تبدأ",
};

export function PhaseStatusTag({ status }: { status: PhaseStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "done" && "bg-primary-soft text-primary",
        status === "active" && "bg-brass-soft text-brass",
        status === "planned" && "border border-rule text-ink-muted",
      )}
    >
      {labels[status]}
    </span>
  );
}
