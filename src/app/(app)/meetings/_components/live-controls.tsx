"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useEffect, useState, useTransition } from "react";
import { FormMessage, inputClass, SubmitButton, type ActionState, inputWith } from "@/components/ui/form";
import { buttonClass } from "@/components/ui/styles";
import { ATTENDANCE, elapsedSeconds, formatDuration } from "@/lib/live";
import { closeItem, setAttendance, setProxy, setQuorumRequired, startMeeting } from "../_actions/live";

/** Running time of the meeting, excluding breaks; ticks every second while live. */
export function MeetingTimer({
  startedAt,
  endedAt,
  breaks,
  plannedMinutes,
}: {
  startedAt: string | null;
  endedAt: string | null;
  breaks: { started_at: string; ended_at: string | null }[];
  plannedMinutes: number;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    if (endedAt) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endedAt]);

  const seconds = now === null ? 0 : elapsedSeconds(startedAt, endedAt, breaks, now);
  const over = seconds > plannedMinutes * 60;
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-rule bg-surface p-5">
      <span className="text-xs text-ink-muted">مدة الانعقاد</span>
      <span className={`font-mono text-4xl tabular-nums ${over ? "text-danger" : "text-ink"}`} dir="ltr" aria-live="off">
        {startedAt ? formatDuration(seconds) : "—"}
      </span>
      <span className="text-xs text-ink-muted">المخطط {plannedMinutes} دقيقة{over && " · تجاوز الوقت"}</span>
    </div>
  );
}

export function AttendanceSelect({ meetingId, personId, value, disabled, allowRemote = true }: { meetingId: string; personId: string; value?: string; disabled: boolean; allowRemote?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <select
      aria-label="حالة الحضور"
      value={value ?? ""}
      disabled={disabled || pending}
      onChange={(e) => start(() => setAttendance(meetingId, personId, e.target.value))}
      className="rounded-md border border-rule bg-surface px-2 py-1.5 text-sm disabled:opacity-60"
    >
      <option value="" disabled>
        لم يُسجّل
      </option>
      {Object.entries(ATTENDANCE).filter(([v]) => allowRemote || v !== "remote" || v === value).map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}

export function ProxySelect({
  meetingId,
  grantorId,
  value,
  holders,
  disabled,
}: {
  meetingId: string;
  grantorId: string;
  value?: string;
  holders: { id: string; name: string }[];
  disabled: boolean;
}) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <span className="flex flex-col gap-1">
      <select
        aria-label="ينوب عنه"
        value={value ?? ""}
        disabled={disabled || pending}
        onChange={(e) => start(async () => setState(await setProxy(meetingId, grantorId, e.target.value)))}
        className="rounded-md border border-brass bg-surface px-2 py-1.5 text-sm"
      >
        <option value="">اختر من ينوب عنه</option>
        {holders.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      {state && !state.ok && <FormMessage state={state} />}
    </span>
  );
}

export function StartMeetingButton({ meetingId, ready }: { meetingId: string; ready: boolean }) {
  const [state, action] = useActionState(() => startMeeting(meetingId), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-2">
      <SubmitButton disabled={!ready} pendingLabel="جارٍ البدء…" className="w-full">
        بدء الاجتماع
      </SubmitButton>
      {!ready && <p className="text-xs text-ink-muted">يُفعَّل بعد اكتمال النصاب، ويسجّل وقت البدء الفعلي.</p>}
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function QuorumOverrideForm({ meetingId, value }: { meetingId: string; value: number | null }) {
  const [state, action] = useActionState(setQuorumRequired.bind(null, meetingId), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-2 text-sm">
      <label className="flex items-center gap-2">
        النصاب المطلوب
        <input name="quorum_required" type="number" min={1} defaultValue={value ?? ""} placeholder="تلقائي" className={inputWith("w-24")} />
      </label>
      <button className={buttonClass("secondary", "w-fit px-3 py-1 text-xs")}>حفظ</button>
      <FormMessage state={state} />
    </ActionForm>
  );
}

export function CloseItemForm({ meetingId, itemId }: { meetingId: string; itemId: string }) {
  const [state, action] = useActionState(closeItem.bind(null, meetingId, itemId), null);
  return (
    <ActionForm action={action} state={state} className="flex flex-col gap-3">
      <textarea spellCheck lang="ar" name="outcome" rows={3} placeholder="ملخص ما انتهى إليه البند (يُنقل لاحقاً إلى المحضر)" className={inputClass} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="status" value="discussed" pendingLabel="…">
          تمت مناقشته · التالي
        </SubmitButton>
        <SubmitButton name="status" value="deferred" variant="secondary" pendingLabel="…">
          تأجيل البند
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </ActionForm>
  );
}
