"use client";

import { useActionState, useState, type ReactNode } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { SwitchRow } from "@/components/ui/switch";
import type { ServiceSettings } from "@/lib/ai";
import { saveServices } from "./actions";

type Status = { ready: boolean; host: string; model: string };

function Group({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-rule bg-surface px-5 py-3">
      <legend className="px-1 font-display text-lg font-bold">{title}</legend>
      {intro && <p className="text-xs text-ink-muted">{intro}</p>}
      <div className="divide-y divide-rule">{children}</div>
    </fieldset>
  );
}

/** The site's switches: each is stored in service_settings and enforced in the database. */
export function ServicesForm({ settings, ai, canManage }: { settings: ServiceSettings; ai: Status; canManage: boolean }) {
  const [state, action] = useActionState(saveServices, null);
  const [aiOn, setAiOn] = useState(settings.ai_enabled);
  const off = !canManage;
  return (
    <ActionForm action={action} state={state} className="mb-10 flex flex-col gap-6">
      <Group title="الذكاء الاصطناعي والخدمات الخارجية" intro="ما يُرسل من نصوص الموقع إلى خدمات خارج قاعدة بياناتك. الأصل الإيقاف لكل ما لا تحتاجه.">
        <SwitchRow
          name="ai_enabled"
          label="الاستعانة بالذكاء الاصطناعي"
          hint={
            ai.ready ? (
              <>
                المزوّد المهيأ: <span dir="ltr">{ai.host}</span> · النموذج <span dir="ltr">{ai.model}</span>
              </>
            ) : (
              "غير مهيأ: يضيف مسؤول الاستضافة متغيرات AI_PROVIDER وAI_API_KEY وAI_MODEL (وAI_BASE_URL للنموذج المستضاف لدى الشركة) في إعدادات الخادم. لا يُدخل المفتاح هنا ولا يُحفظ في قاعدة البيانات."
            )
          }
          checked={aiOn}
          onChange={(e) => setAiOn(e.target.checked)}
          disabled={off || (!ai.ready && !aiOn)}
        >
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
        </SwitchRow>
        <SwitchRow
          name="ai_no_retention_confirmed"
          label="إقرار عدم الاحتفاظ بالبيانات"
          hint="أؤكد أن مزوّد الخدمة ملتزم تعاقدياً بعدم حفظ البيانات وعدم استخدامها في التدريب، أو أن النموذج مستضاف لدى الشركة. شرط لتفعيل الذكاء الاصطناعي."
          defaultChecked={settings.ai_no_retention_confirmed}
          required={aiOn}
          disabled={off}
        />
        <SwitchRow
          name="external_translation"
          label="الترجمة الآلية للإنجليزية"
          hint="خدمة عامة مجانية (ترجمة Google وMyMemory) بلا عقد؛ لا ضمان لعدم احتفاظها بالنص. أوقفها إذا كانت البنود سرية."
          defaultChecked={settings.external_translation}
          disabled={off}
        />
        <SwitchRow
          name="external_spelling"
          label="التدقيق الإملائي الكامل"
          hint="خدمة LanguageTool العامة بلا عقد. تدقيق مصطلحات الحوكمة يعمل داخل الموقع دائماً."
          defaultChecked={settings.external_spelling}
          disabled={off}
        />
      </Group>

      <Group title="الاجتماعات والقرارات">
        <SwitchRow
          name="remote_meetings"
          label="الاجتماعات والحضور عن بُعد"
          hint="عند الإيقاف لا يُنشأ اجتماع عن بُعد أو مدمج، ولا يُسجّل حضور عن بُعد. أوقفه إذا اشترط النظام الأساس الحضور الشخصي."
          defaultChecked={settings.remote_meetings}
          disabled={off}
        />
        <SwitchRow
          name="circular_enabled"
          label="القرارات بالتمرير"
          hint="عند الإيقاف لا تُطرح قرارات جديدة بالتمرير، وتكمل المطروحة تصويتها. أوقفه إذا لم يُجزها النظام الأساس."
          defaultChecked={settings.circular_enabled}
          disabled={off}
        />
        <SwitchRow
          name="pack_requires_disclosure"
          label="الإفصاح السنوي شرط لفتح حزمة الاجتماع"
          hint="لا يفتح عضو المجلس أو اللجنة مستندات الحزمة حتى يقدّم إفصاحه عن تعارض المصالح لهذا العام. لا يشمل الأمين والمنظمين والضيوف."
          defaultChecked={settings.pack_requires_disclosure}
          disabled={off}
        />
      </Group>

      <Group title="الخصوصية">
        <SwitchRow
          name="hide_contacts"
          label="إخفاء بريد الأعضاء وجوالاتهم"
          hint="يرى بيانات التواصل صاحبها وأمين السر ومنظمو الاجتماعات ومحررو ملفات الأعضاء فقط."
          defaultChecked={settings.hide_contacts}
          disabled={off}
        />
      </Group>

      {canManage && (
        <div className="flex flex-col gap-2">
          <FormMessage state={state} />
          <SubmitButton className="w-fit">حفظ الإعدادات</SubmitButton>
        </div>
      )}
    </ActionForm>
  );
}
