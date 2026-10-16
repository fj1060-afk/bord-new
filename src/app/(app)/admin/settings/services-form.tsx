"use client";

import { useActionState, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { ServiceSettings } from "@/lib/ai";
import { saveServices } from "./actions";

type Status = { ready: boolean; host: string; model: string; provider: string };

/** Switches for AI and the free outside services that receive the site's text. */
export function ServicesForm({ settings, ai, canManage }: { settings: ServiceSettings; ai: Status; canManage: boolean }) {
  const [state, action] = useActionState(saveServices, null);
  const [aiOn, setAiOn] = useState(settings.ai_enabled);
  const box = "mt-0.5 shrink-0";
  return (
    <section className="mb-10 rounded-lg border border-rule bg-surface p-5">
      <h2 className="font-display text-xl font-bold">الذكاء الاصطناعي والخدمات الخارجية</h2>
      <p className="mt-1 text-sm text-ink-muted">ما يُرسل من نصوص الموقع إلى خدمات خارج قاعدة بياناتك. الأصل الإيقاف لكل ما لا تحتاجه.</p>

      <ActionForm action={action} state={state} className="mt-5 flex flex-col gap-5">
        <fieldset className="flex flex-col gap-3 rounded-md border border-rule p-4" disabled={!canManage}>
          <label className="flex items-start gap-2 font-medium">
            <input type="checkbox" name="ai_enabled" className={box} checked={aiOn} onChange={(e) => setAiOn(e.target.checked)} disabled={!ai.ready && !aiOn} />
            تفعيل الاستعانة بالذكاء الاصطناعي
          </label>
          <p className="text-xs text-ink-muted">
            {ai.ready ? (
              <>
                المزوّد المهيأ: <span dir="ltr">{ai.host}</span> · النموذج <span dir="ltr">{ai.model}</span>
              </>
            ) : (
              "غير مهيأ: يضيف مسؤول الاستضافة متغيرات AI_PROVIDER وAI_API_KEY وAI_MODEL (وAI_BASE_URL للنموذج المستضاف ذاتياً) في إعدادات الخادم. لا يُدخل المفتاح هنا ولا يُحفظ في قاعدة البيانات."
            )}
          </p>
          <div className="rounded bg-paper p-3 text-xs leading-6">
            <strong className="block text-sm">ما يضمنه الموقع</strong>
            <ul className="list-disc ps-5">
              <li>يُرسل النص المطلوب فقط، وقت الطلب، من الخادم مباشرة؛ ولا يمر المفتاح بالمتصفح.</li>
              <li>لا يُحفظ ما يُرسل ولا ما يعود في سجلات أو ذاكرة مؤقتة أو قاعدة البيانات.</li>
              <li>لا يُحفظ اقتراح الذكاء الاصطناعي إلا إذا اعتمده المستخدم بنفسه.</li>
              <li>الإيقاف فوري: يتوقف كل إرسال لحظة إلغاء التفعيل.</li>
            </ul>
            <strong className="mt-2 block text-sm">ما يعتمد على المزوّد</strong>
            <p>عدم احتفاظ المزوّد بالبيانات لا يضمنه الموقع، بل عقدك معه: اتفاقية عدم الاحتفاظ بالبيانات (Zero Data Retention) وعدم استخدامها في التدريب، وموقع معالجتها. البديل الأعلى سرية نموذج مستضاف على خوادم الشركة.</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="ai_no_retention_confirmed" className={box} defaultChecked={settings.ai_no_retention_confirmed} required={aiOn} />
            أؤكد أن مزوّد الخدمة ملتزم تعاقدياً بعدم حفظ البيانات وعدم استخدامها في التدريب، أو أن النموذج مستضاف لدى الشركة.
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-md border border-rule p-4" disabled={!canManage}>
          <strong className="text-sm">خدمات مجانية خارجية</strong>
          <p className="text-xs text-ink-muted">خدمات عامة بلا عقد؛ لا ضمان لعدم احتفاظها بالنص. أوقفها إذا كانت بنود الاجتماعات سرية.</p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="external_translation" className={box} defaultChecked={settings.external_translation} />
            الترجمة الآلية للإنجليزية (ترجمة Google وMyMemory)
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="external_spelling" className={box} defaultChecked={settings.external_spelling} />
            التدقيق الإملائي الكامل (LanguageTool)؛ تدقيق مصطلحات الحوكمة يعمل داخل الموقع دائماً
          </label>
        </fieldset>

        {canManage && (
          <div className="flex flex-col gap-2">
            <FormMessage state={state} />
            <SubmitButton className="w-fit">حفظ الإعدادات</SubmitButton>
          </div>
        )}
      </ActionForm>
    </section>
  );
}
