import { BOARD_CATEGORIES, BOARD_POSITIONS } from "./org";

// Groups the people in a person picker by where they sit, so a list of names
// shows who is the chair, who already serves on the board or a committee,
// who is in management and which department everyone else belongs to.

export type PersonFacts = {
  id: string;
  full_name: string;
  executive_title?: string | null;
  board?: { position: string; category: string | null } | null;
  committees?: { name: string; position: string }[];
  departments?: string[];
};
export type GroupedPerson = { id: string; full_name: string; role: string };
export type PersonGroup = { label: string; people: GroupedPerson[] };

/** "رئيس لجنة المراجعة", "عضو لجنة المراجعة", "أمين لجنة المراجعة". */
const COMMITTEE_ROLE: Record<string, string> = { chair: "رئيس", member: "عضو", secretary: "أمين" };
const BOARD_ORDER = ["chair", "vice_chair", "member"];
const label = <T extends Record<string, string>>(map: T, key: string | null | undefined) => (key && key in map ? map[key as keyof T] : "");

export function groupPeople(people: PersonFacts[]): PersonGroup[] {
  const board: (GroupedPerson & { rank: number })[] = [];
  const committees: GroupedPerson[] = [];
  const executives: GroupedPerson[] = [];
  const byDept = new Map<string, GroupedPerson[]>();
  const others: GroupedPerson[] = [];
  for (const p of people) {
    const inCommittees = (p.committees ?? []).map((c) => `${COMMITTEE_ROLE[c.position] ?? "عضو"} ${c.name}`);
    if (p.board) {
      const role = [label(BOARD_POSITIONS, p.board.position), label(BOARD_CATEGORIES, p.board.category), ...inCommittees].filter(Boolean).join(" · ");
      board.push({ id: p.id, full_name: p.full_name, role, rank: BOARD_ORDER.indexOf(p.board.position) });
    } else if (inCommittees.length) committees.push({ id: p.id, full_name: p.full_name, role: inCommittees.join(" · ") });
    else if (p.executive_title) executives.push({ id: p.id, full_name: p.full_name, role: p.executive_title });
    else if (p.departments?.length) {
      const dept = p.departments[0];
      byDept.set(dept, [...(byDept.get(dept) ?? []), { id: p.id, full_name: p.full_name, role: dept }]);
    } else others.push({ id: p.id, full_name: p.full_name, role: "" });
  }
  board.sort((a, b) => a.rank - b.rank || a.full_name.localeCompare(b.full_name, "ar"));
  const groups: PersonGroup[] = [
    { label: "أعضاء مجلس الإدارة", people: board.map((p) => ({ id: p.id, full_name: p.full_name, role: p.role })) },
    { label: "أعضاء اللجان", people: committees },
    { label: "الإدارة التنفيذية", people: executives },
    ...[...byDept.entries()].sort(([a], [b]) => a.localeCompare(b, "ar")).map(([name, list]) => ({ label: name, people: list })),
    { label: "أشخاص آخرون", people: others },
  ];
  return groups.filter((g) => g.people.length);
}
