// The statutory layer of each committee: its competencies with their nature
// (decide, recommend to the board, review, follow up) and its composition
// and meeting rules, from the CMA Corporate Governance Regulations (CGR,
// official English translation; the Arabic text governs). Articles marked
// `guiding` are guidance even for listed companies.

import { fold } from "./fold";

export const POWER_KINDS = { decide: "تقرر", recommend: "توصي للمجلس", review: "تراجع وتبدي رأيها", follow: "تتابع وتشرف" } as const;
export type PowerKind = keyof typeof POWER_KINDS;
export type Power = { ar: string; kind: PowerKind; ref: string; keys: string[]; guiding?: true };
export type Rule = { ar: string; ref: string; guiding?: true };

const AUDIT: Power[] = [
  { ar: "دراسة القوائم المالية الأولية والسنوية قبل عرضها على المجلس، وإبداء الرأي والتوصية بشأنها", kind: "recommend", ref: "م52/أ/1", keys: ["القوائم المالية"] },
  { ar: "إبداء الرأي الفني، بطلب المجلس، في عدالة تقرير المجلس والقوائم المالية ووضوحهما", kind: "review", ref: "م52/أ/2", keys: ["تقرير مجلس الإدارة"] },
  { ar: "دراسة السياسات والتقديرات المحاسبية الجوهرية، وإبداء الرأي والتوصية للمجلس", kind: "recommend", ref: "م52/أ/5-6", keys: ["السياسات المحاسبية", "التقديرات المحاسبية"] },
  { ar: "دراسة نظام الرقابة الداخلية والمالية وإدارة المخاطر ومراجعته", kind: "review", ref: "م52/ب/1", keys: ["الرقابة الداخلية", "الرقابة المالية"] },
  { ar: "دراسة تقارير المراجعة الداخلية ومتابعة تنفيذ الإجراءات التصحيحية", kind: "follow", ref: "م52/ب/2", keys: ["تقارير المراجعة الداخلية", "تقرير المراجعة الداخلية"] },
  { ar: "الرقابة والإشراف على أداء المراجع الداخلي وإدارة المراجعة الداخلية", kind: "follow", ref: "م52/ب/3", keys: ["أداء المراجعة الداخلية"] },
  { ar: "التوصية للمجلس بتعيين مدير المراجعة الداخلية أو المراجع الداخلي واقتراح مكافأته", kind: "recommend", ref: "م52/ب/4", keys: ["مدير إدارة المراجعة الداخلية", "مدير المراجعة الداخلية", "المراجع الداخلي"] },
  { ar: "اعتماد خطة المراجعة الداخلية وتحديثها سنوياً", kind: "decide", ref: "م74", keys: ["خطة المراجعة الداخلية"] },
  { ar: "التوصية للمجلس بترشيح مراجعي الحسابات وعزلهم وتحديد أتعابهم وتقييم أدائهم", kind: "recommend", ref: "م52/ج/1", keys: ["مراجع الحسابات", "مراجعي الحسابات", "المراجع الخارجي"] },
  { ar: "التحقق من استقلال مراجع الحسابات وموضوعيته وفاعلية أعمال المراجعة", kind: "review", ref: "م52/ج/2", keys: ["استقلال مراجع"] },
  { ar: "مراجعة خطة مراجع الحسابات وتقاريره وملاحظاته على القوائم المالية ومتابعة ما اتُّخذ بشأنها", kind: "review", ref: "م52/ج/3 و5", keys: ["خطاب الإدارة", "ملاحظات مراجع", "خطة مراجع"] },
  { ar: "مراجعة نتائج تقارير الجهات الرقابية والتحقق من اتخاذ الشركة الإجراءات اللازمة", kind: "review", ref: "م52/د/1", keys: ["الجهات الرقابية", "الجهات الإشرافية"] },
  { ar: "التحقق من التزام الشركة بالأنظمة واللوائح والسياسات والتعليمات", kind: "follow", ref: "م52/د/2", keys: ["الالتزام"] },
  { ar: "مراجعة العقود والتعاملات المقترح إجراؤها مع الأطراف ذات العلاقة، وتقديم التوصية للمجلس", kind: "recommend", ref: "م52/د/3", keys: ["الأطراف ذات العلاقة", "طرف ذي علاقة"] },
  { ar: "وضع آلية تتيح للموظفين تقديم ملاحظاتهم على التقارير المالية بسرية، والتحقق منها ومتابعتها", kind: "decide", ref: "م55", keys: ["البلاغات", "الإبلاغ عن المخالفات"] },
  { ar: "الاطلاع على سجلات الشركة ووثائقها، وطلب الإيضاحات من أعضاء المجلس والإدارة التنفيذية", kind: "decide", ref: "م56/1-2", keys: ["طلب إيضاح", "الاطلاع على سجلات"] },
  { ar: "طلب دعوة الجمعية العامة إذا أعاق المجلس عملها أو تعرضت الشركة لأضرار أو خسائر جسيمة", kind: "decide", ref: "م56/3", keys: ["دعوة الجمعية"] },
];

const REMUNERATION: Power[] = [
  { ar: "إعداد سياسة مكافآت أعضاء المجلس واللجان والإدارة التنفيذية ورفعها للمجلس تمهيداً لاعتمادها من الجمعية العامة", kind: "recommend", ref: "م58/1", keys: ["سياسة المكافآت", "سياسة مكافآت"] },
  { ar: "توضيح العلاقة بين المكافآت المدفوعة وسياسة المكافآت، وبيان أي انحراف جوهري عنها", kind: "review", ref: "م58/2", keys: ["المكافآت المدفوعة"] },
  { ar: "المراجعة الدورية لسياسة المكافآت وتقييم مدى فاعليتها", kind: "review", ref: "م58/3", keys: ["فاعلية سياسة المكافآت"] },
  { ar: "التوصية للمجلس بمكافآت أعضائه وأعضاء اللجان وكبار التنفيذيين وفق السياسة المعتمدة", kind: "recommend", ref: "م58/4", keys: ["مكافآت", "مكافأة"] },
];

const NOMINATION: Power[] = [
  { ar: "اقتراح سياسات ومعايير واضحة للعضوية في المجلس والإدارة التنفيذية", kind: "recommend", ref: "م62/1", keys: ["معايير العضوية", "سياسة الترشيح", "سياسات العضوية"] },
  { ar: "التوصية للمجلس بترشيح أعضائه وإعادة ترشيحهم وفق السياسات والمعايير المعتمدة", kind: "recommend", ref: "م62/2", keys: ["المرشحين", "ترشيح", "الترشح"] },
  { ar: "إعداد وصف للقدرات والمؤهلات المطلوبة لعضوية المجلس وشغل وظائف الإدارة التنفيذية", kind: "review", ref: "م62/3", keys: ["المؤهلات المطلوبة", "القدرات المطلوبة"] },
  { ar: "تحديد الوقت الذي يلزم أن يخصصه العضو لأعمال المجلس", kind: "recommend", ref: "م62/4", keys: ["الوقت الذي يخصصه"] },
  { ar: "المراجعة السنوية للمهارات والخبرات اللازمة لأعضاء المجلس والإدارة التنفيذية", kind: "review", ref: "م62/5", keys: ["المهارات", "مصفوفة المهارات"] },
  { ar: "مراجعة هيكل المجلس والإدارة التنفيذية والتوصية بالتغييرات الممكن إجراؤها", kind: "recommend", ref: "م62/6", keys: ["هيكل المجلس"] },
  { ar: "التحقق سنوياً من استقلال الأعضاء المستقلين وعدم وجود تعارض مصالح", kind: "review", ref: "م62/7", keys: ["استقلال الأعضاء", "الأعضاء المستقلين"] },
  { ar: "وضع أوصاف وظيفية للأعضاء التنفيذيين وغير التنفيذيين والمستقلين وكبار التنفيذيين", kind: "recommend", ref: "م62/8", keys: ["أوصاف وظيفية", "الوصف الوظيفي"] },
  { ar: "وضع الإجراءات الخاصة في حال شغور مركز أحد أعضاء المجلس أو كبار التنفيذيين", kind: "recommend", ref: "م62/9", keys: ["شغور", "الإحلال والتعاقب"] },
  { ar: "تحديد جوانب القوة والضعف في المجلس واقتراح الحلول لمعالجتها", kind: "recommend", ref: "م62/10", keys: ["تقييم أداء المجلس", "نقاط القوة والضعف"] },
];

const RISK: Power[] = [
  { ar: "وضع استراتيجية وسياسات شاملة لإدارة المخاطر، ومتابعة تنفيذها ومراجعتها وتحديثها", kind: "recommend", ref: "م68/1", keys: ["سياسة إدارة المخاطر", "استراتيجية المخاطر", "سياسة المخاطر"], guiding: true },
  { ar: "تحديد مستوى مقبول للمخاطر والمحافظة عليه، والتحقق من عدم تجاوزه", kind: "decide", ref: "م68/2", keys: ["مستوى قبول المخاطر", "المستوى المقبول للمخاطر"], guiding: true },
  { ar: "التحقق من جدوى استمرار الشركة وتحديد المخاطر التي تهدد استمرارها خلال الاثني عشر شهراً التالية", kind: "review", ref: "م68/3", keys: ["استمرار الشركة", "استمرارية الشركة"], guiding: true },
  { ar: "الإشراف على نظام إدارة المخاطر وتقييم فاعلية تحديد المخاطر ومتابعتها", kind: "follow", ref: "م68/4", keys: ["سجل المخاطر", "نظام إدارة المخاطر"], guiding: true },
  { ar: "إعادة تقييم قدرة الشركة على تحمل المخاطر دورياً، كاختبارات التحمل", kind: "review", ref: "م68/5", keys: ["اختبارات التحمل", "تحمل المخاطر"], guiding: true },
  { ar: "إعداد تقارير مفصلة عن التعرض للمخاطر والإجراءات المقترحة لإدارتها ورفعها للمجلس", kind: "recommend", ref: "م68/6", keys: ["التعرض للمخاطر", "تقرير المخاطر"], guiding: true },
  { ar: "التوصية للمجلس في المسائل المتعلقة بإدارة المخاطر", kind: "recommend", ref: "م68/7", keys: ["إدارة المخاطر"], guiding: true },
  { ar: "مراجعة الهيكل التنظيمي لإدارة المخاطر والتوصية بشأنه قبل اعتماده من المجلس", kind: "recommend", ref: "م68/9", keys: ["الهيكل التنظيمي لإدارة المخاطر"], guiding: true },
  { ar: "مراجعة المسائل التي تثيرها لجنة المراجعة مما قد يؤثر في إدارة المخاطر", kind: "review", ref: "م68/12", keys: ["ما تثيره لجنة المراجعة"], guiding: true },
];

const ALL_COMMITTEES: Rule[] = [
  { ar: "لا يقل عدد الأعضاء عن ثلاثة ولا يزيد على خمسة", ref: "م47/4" },
  { ar: "يحدد المجلس مهام اللجنة ومدتها وصلاحياتها وطريقة رقابته عليها", ref: "م47/2" },
  { ar: "تُبلغ الهيئة بأسماء الأعضاء وصفاتهم خلال خمسة أيام من تعيينهم أو أي تغيير", ref: "م47/6" },
];

export type CommitteeRules = { powers: Power[]; composition: Rule[]; minMeetings: { perYear: number; ref: string; guiding?: true } | null; charterBy: { ar: string; ref: string } };

const NO_EXECUTIVE: Rule = { ar: "لا يكون من أعضائها عضو مجلس تنفيذي، وفيها عضو مستقل على الأقل", ref: "" };

/** The statutory layer for a committee kind; null for kinds the regulations do not set (executive, other). */
export function committeeRules(kind: string): CommitteeRules | null {
  switch (kind) {
    case "audit":
      return {
        powers: AUDIT,
        composition: [
          ...ALL_COMMITTEES,
          { ar: "لا يكون من أعضائها عضو مجلس تنفيذي، وأحد أعضائها مختص بالشؤون المالية والمحاسبية", ref: "م51/أ" },
          { ar: "فيها عضو مستقل على الأقل", ref: "م51/ب" },
          { ar: "رئيسها عضو مستقل", ref: "م51/ج", guiding: true },
          { ar: "نصف أعضائها مستقلون أو ممن لا تنطبق عليهم عوارض الاستقلال", ref: "م51/د", guiding: true },
          { ar: "لا يكون من أعضائها من عمل خلال السنتين السابقتين في الإدارة المالية أو التنفيذية للشركة أو لدى مراجع حساباتها", ref: "م51/و" },
          { ar: "لا يكون العضو في لجان مراجعة أكثر من خمس شركات مدرجة في الوقت نفسه", ref: "م51/ز" },
        ],
        minMeetings: { perYear: 4, ref: "م54/أ" },
        charterBy: { ar: "الجمعية العامة بتوصية من المجلس", ref: "م51/هـ" },
      };
    case "remuneration":
      return { powers: REMUNERATION, composition: [...ALL_COMMITTEES, { ...NO_EXECUTIVE, ref: "م57/أ" }], minMeetings: { perYear: 1, ref: "م60" }, charterBy: { ar: "الجمعية العامة بتوصية من المجلس", ref: "م57/ب" } };
    case "nomination":
      return { powers: NOMINATION, composition: [...ALL_COMMITTEES, { ...NO_EXECUTIVE, ref: "م61/أ" }], minMeetings: { perYear: 1, ref: "م64" }, charterBy: { ar: "الجمعية العامة بتوصية من المجلس", ref: "م61/ب" } };
    case "remuneration_nomination":
      return {
        powers: [...REMUNERATION, ...NOMINATION],
        composition: [...ALL_COMMITTEES, { ...NO_EXECUTIVE, ref: "م57/أ وم61/أ" }, { ar: "تستوفي متطلبات لجنتي المكافآت والترشيحات معاً", ref: "م47/7" }],
        minMeetings: { perYear: 2, ref: "م47/7" },
        charterBy: { ar: "الجمعية العامة بتوصية من المجلس", ref: "م57/ب وم61/ب" },
      };
    case "risk":
      return {
        powers: RISK,
        composition: [...ALL_COMMITTEES, { ar: "رئيسها وأغلبية أعضائها من غير التنفيذيين، ولديهم معرفة بإدارة المخاطر والشؤون المالية", ref: "م67", guiding: true }],
        minMeetings: { perYear: 2, ref: "م69", guiding: true },
        charterBy: { ar: "مجلس الإدارة", ref: "م47/2" },
      };
    default:
      return null;
  }
}

// Wording that makes an item a decision of the committee itself.
const DECIDING = /(^|\s)(التصويت علي )?(اعتماد|الموافقه علي|اقرار|اقر|تعيين|عزل|الترخيص|صرف|تحديد)(\s|$)/;
const RECOMMENDING = /(التوصيه|توصيه|رفع|الرفع|ورفعها|ورفعه|ابداء الراي|الاطلاع|مناقشه|مراجعه|دراسه|متابعه)/;

export type PowerCheck = { power: Power | null; deciding: boolean };

/** The committee competency an item's text falls under, and whether the item decides rather than recommends. */
export function checkAgainstPowers(text: string, powers: Power[]): PowerCheck {
  const t = fold(text);
  const deciding = DECIDING.test(t) && !RECOMMENDING.test(t);
  const power = powers.find((p) => p.keys.some((k) => t.includes(fold(k)))) ?? null;
  return { power, deciding };
}

/** The item reworded as a recommendation to the board ("اعتماد X" → "التوصية لمجلس الإدارة باعتماد X"). */
export function asRecommendation(title: string): string {
  const core = title.trim().replace(/^التصويت على\s+/, "");
  return /^(اعتماد|الموافقة على|إقرار|تعيين|عزل|صرف|تحديد)/.test(core) ? `التوصية لمجلس الإدارة ب${core}` : `التوصية لمجلس الإدارة بشأن ${core}`;
}

export type CompositionMember = { name: string; position: string; boardCategory: string | null };
export type CompositionCheck = { ok: boolean; ar: string; ref: string; guiding?: true };

/**
 * How the committee's current members meet its composition rules. Who is
 * independent or executive is known only for board members (their board
 * category); the finance specialist cannot be checked and is listed as a reminder.
 */
export function compositionChecks(kind: string, members: CompositionMember[]): CompositionCheck[] {
  const rules = committeeRules(kind);
  if (!rules) return [];
  const voting = members.filter((m) => m.position !== "secretary");
  const executives = voting.filter((m) => m.boardCategory === "executive");
  const independents = voting.filter((m) => m.boardCategory === "independent");
  const chair = voting.find((m) => m.position === "chair");
  const out: CompositionCheck[] = [
    { ok: voting.length >= 3 && voting.length <= 5, ar: `عدد الأعضاء ${voting.length}: من ثلاثة إلى خمسة`, ref: "م47/4" },
  ];
  if (kind === "audit" || kind === "remuneration" || kind === "nomination" || kind === "remuneration_nomination") {
    const ref = kind === "audit" ? "م51/أ" : kind === "remuneration" ? "م57/أ" : kind === "nomination" ? "م61/أ" : "م57/أ وم61/أ";
    out.push({ ok: executives.length === 0, ar: executives.length ? `عضو مجلس تنفيذي في اللجنة: ${executives.map((m) => m.name).join("، ")}` : "لا أعضاء مجلس تنفيذيين", ref });
    out.push({ ok: independents.length >= 1, ar: independents.length ? `${independents.length} عضو مستقل` : "لا عضو مستقل بين أعضائها", ref: kind === "audit" ? "م51/ب" : ref });
  }
  if (kind === "audit") {
    out.push({ ok: chair?.boardCategory === "independent", ar: chair ? (chair.boardCategory === "independent" ? "رئيسها مستقل" : `رئيسها (${chair.name}) غير مستقل أو ليس عضواً في المجلس`) : "لم يُحدد رئيس اللجنة", ref: "م51/ج", guiding: true });
    out.push({ ok: independents.length * 2 >= voting.length && voting.length > 0, ar: `المستقلون ${independents.length} من ${voting.length}: النصف على الأقل`, ref: "م51/د", guiding: true });
  }
  if (kind === "risk") {
    const nonExec = voting.filter((m) => m.boardCategory !== "executive").length;
    out.push({ ok: chair?.boardCategory !== "executive" && nonExec * 2 > voting.length, ar: "رئيسها وأغلبية أعضائها غير تنفيذيين", ref: "م67", guiding: true });
  }
  return out;
}
