import { AUTHORITY, type Authority } from "@/lib/authority";

const TONE: Record<Authority, string> = {
  board: "border-rule text-ink-muted",
  board_then_ga: "border-brass text-brass",
  board_authorized: "border-brass text-brass",
  ga_ordinary: "border-primary text-primary",
  ga_extraordinary: "border-primary text-primary",
  bylaws: "border-brass text-brass",
  committee: "border-rule text-ink-muted",
};

/** Who decides an item: the board, the board then the assembly, the assembly, or per the bylaws. */
export function AuthorityBadge({ authority }: { authority?: Authority }) {
  if (!authority) return null;
  return (
    <span title={AUTHORITY[authority].hint} className={`rounded-full border px-2 py-0.5 text-xs ${TONE[authority]}`}>
      {AUTHORITY[authority].label}
    </span>
  );
}
