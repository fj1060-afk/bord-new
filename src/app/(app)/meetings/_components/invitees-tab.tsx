import clsx from "clsx";
import { ConfirmButton } from "@/components/org/confirm-button";
import { RSVP } from "@/lib/meetings";
import { removeInvitee } from "../_actions/meeting";
import { AddGuestForm } from "./meeting-forms";

type Invitee = { person_id: string; kind: string; rsvp: string; rsvp_note: string | null; person: { full_name: string } };

export function InviteesTab({
  meetingId,
  invitees,
  people,
  editable,
}: {
  meetingId: string;
  invitees: Invitee[];
  people: { id: string; full_name: string }[];
  editable: boolean;
}) {
  const invited = new Set(invitees.map((i) => i.person_id));
  const sorted = [...invitees].sort((a, b) => a.kind.localeCompare(b.kind) || a.person.full_name.localeCompare(b.person.full_name, "ar"));

  return (
    <div className="flex flex-col gap-4">
      {editable && (
        <div className="rounded-lg border border-rule bg-surface p-5">
          <p className="mb-3 text-sm font-medium">دعوة ضيف (مثل مقدّم بند من الإدارة التنفيذية)</p>
          <AddGuestForm meetingId={meetingId} people={people.filter((p) => !invited.has(p.id))} />
        </div>
      )}
      <ul className="divide-y divide-rule rounded-lg border border-rule bg-surface">
        {sorted.length === 0 && <li className="p-8 text-center text-sm text-ink-muted">لا يوجد مدعوون. أضف أعضاء للجهة ثم أنشئ الاجتماع، أو ادعُ ضيوفاً.</li>}
        {sorted.map((i) => (
          <li key={i.person_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{i.person.full_name}</span>
              {i.kind === "guest" && <span className="ms-2 text-xs text-brass">ضيف</span>}
              {i.rsvp_note && <span className="block text-xs text-ink-muted">{i.rsvp_note}</span>}
            </span>
            <span
              className={clsx(
                i.rsvp === "accepted" && "text-primary",
                i.rsvp === "declined" && "text-danger",
                (i.rsvp === "pending" || i.rsvp === "tentative") && "text-ink-muted",
              )}
            >
              {RSVP[i.rsvp as keyof typeof RSVP]}
            </span>
            {editable && (
              <ConfirmButton action={removeInvitee.bind(null, meetingId, i.person_id)} label="إزالة" confirm={`إزالة ${i.person.full_name} من المدعوين؟`} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
