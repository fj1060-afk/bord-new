"use client";

import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { EnglishRichField, RichTextField } from "@/components/ui/rich-text-field";
import { saveDocIntro } from "../_actions/doc-intros";

const TITLES = { agenda: "مقدمة الدعوة وجدول الأعمال", attendance: "مقدمة كشف الحضور" };
const HINTS = {
  agenda: "تُطبع بعد بيانات الاجتماع، مثل: «يسرّني دعوتكم لحضور اجتماع المجلس…».",
  attendance: "تُطبع أعلى كشف الحضور، مثل تعليمات التوقيع أو ملاحظة عن الحضور عن بُعد.",
};

export function DocIntroForm({ meetingId, doc, intro, introEn }: { meetingId: string; doc: "agenda" | "attendance"; intro: string | null; introEn: string | null }) {
  const [state, action] = useActionState(saveDocIntro.bind(null, meetingId, doc), null);
  return (
    <details open={!!intro} className="rounded-lg border border-rule bg-surface">
      <summary className="cursor-pointer px-5 py-3 text-sm font-medium">{TITLES[doc]}</summary>
      <ActionForm action={action} state={state} className="flex flex-col gap-3 border-t border-rule p-5">
        <p className="text-xs text-ink-muted">{HINTS[doc]}</p>
        <RichTextField name="intro" defaultValue={intro} label={TITLES[doc]} />
        <EnglishRichField name="intro_en" defaultValue={introEn} />
        <FormMessage state={state} />
        <SubmitButton pendingLabel="…" className="w-fit">
          حفظ المقدمة
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
