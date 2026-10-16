// The built-in library of standard agenda items (Saudi market practice).
// References were checked against the Companies Law, the CMA Corporate
// Governance Regulations and the CMA continuing obligations rules; see
// docs/GOVERNANCE-RULES.md.

export type Kind = "information" | "discussion" | "decision";
/** Which meeting an item belongs to; "any" fits every board or committee meeting. */
export type Body = "board" | "audit" | "nrc" | "risk" | "any";
export type Template = { category: string; body: Body; keys: string[]; title: string; en?: string; kind: Kind; needs?: string };

export const BODIES: Record<Body, string> = { board: "مجلس الإدارة", audit: "لجنة المراجعة", nrc: "لجنة الترشيحات والمكافآت", risk: "لجنة المخاطر", any: "أي اجتماع" };

export const CATEGORIES = [
  "الاجتماعات والمحاضر",
  "التقارير المالية والموازنة",
  "المراجعة والأرباح",
  "المجلس والإدارة التنفيذية",
  "اللجان والسياسات والخطط",
  "الحوكمة والالتزام",
  "العقود والتمويل والاستثمار",
  "البنوك والتفويضات والشركات التابعة",
  "رأس المال والجمعيات",
  "اجتماعات لجنة المراجعة",
  "اجتماعات لجنة الترشيحات والمكافآت",
  "اجتماعات لجنة المخاطر",
  "بنود الشركة",
] as const;

const QUARTERS = [
  ["31 مارس", "31 March"],
  ["30 يونيو", "30 June"],
  ["30 سبتمبر", "30 September"],
  ["31 ديسمبر", "31 December"],
];

type T = Omit<Template, "category">;

/** What a policy item needs before the board votes on it. */
const POLICY = "مسودة السياسة النهائية؛ جدول مقارنة التعديلات ومبرراتها (عند التحديث)؛ توصية اللجنة المختصة؛ المراجعة القانونية والتوافق مع الأنظمة والنظام الأساس؛ الإدارة المالكة للسياسة وتاريخ النفاذ وموعد المراجعة القادمة";
const group = (category: (typeof CATEGORIES)[number], items: T[]): Template[] => items.map((i) => ({ category, ...i }));

/** Templates dated from `today`: `year` is the last completed financial year, `q` the last completed quarter. */
export function buildTemplates(today: Date): Template[] {
  const now = today.getFullYear();
  const year = now - 1;
  const q = Math.floor(today.getMonth() / 3);
  const [qYear, [qEnd, qEndEn]] = q === 0 ? [year, QUARTERS[3]] : [now, QUARTERS[q - 1]];
  const fy = `للسنة المالية المنتهية في 31 ديسمبر ${year}`;
  const fyEn = `for the financial year ended 31 December ${year}`;
  const period = `للفترة المنتهية في ${qEnd} ${qYear}`;
  const periodEn = `for the period ended ${qEndEn} ${qYear}`;
  const ga = "التوصية للجمعية العامة العادية";
  const gaEn = "Recommending to the Ordinary General Assembly";
  const ega = "التوصية للجمعية العامة غير العادية";
  const egaEn = "Recommending to the Extraordinary General Assembly";

  return [
    ...group("الاجتماعات والمحاضر", [
      { body: "any", keys: ["جدول الاعمال", "جدول اعمال"], kind: "decision", title: "التصويت على اعتماد جدول أعمال الاجتماع", en: "Approving the meeting agenda" },
      { body: "any", keys: ["المحضر", "محضر", "الاجتماع السابق"], kind: "decision", title: "التصويت على اعتماد محضر الاجتماع السابق", en: "Approving the minutes of the previous meeting", needs: "مسودة المحضر المعمّمة على الأعضاء" },
      { body: "any", keys: ["متابعه", "القرارات السابقه", "تنفيذ القرارات"], kind: "information", title: "متابعة تنفيذ القرارات السابقة", en: "Follow-up on the implementation of previous resolutions", needs: "سجل متابعة القرارات" },
      { body: "board", keys: ["التمرير", "بالتمرير"], kind: "decision", title: "إثبات قرارات المجلس الصادرة بالتمرير منذ الاجتماع السابق", en: "Recording the board resolutions passed by circulation since the previous meeting", needs: "نسخ القرارات ونتائج التصويت (نظام الشركات م82)" },
      { body: "any", keys: ["تعارض", "الافصاح عن"], kind: "information", title: "إفصاح الأعضاء عن تعارض المصالح في بنود الاجتماع", en: "Members' disclosure of conflicts of interest in the agenda items", needs: "سجل الإفصاحات (نظام الشركات م71)" },
      { body: "board", keys: ["تقرير الرئيس التنفيذي", "الرئيس التنفيذي", "تقرير الاداره"], kind: "information", title: `الاطلاع على تقرير الرئيس التنفيذي عن أداء الشركة ${period}`, en: `Reviewing the CEO's report on the company's performance ${periodEn}`, needs: "تقرير الرئيس التنفيذي" },
      { body: "any", keys: ["تقارير اللجان", "تقرير اللجان"], kind: "information", title: "الاطلاع على تقارير لجان المجلس وتوصياتها", en: "Reviewing the reports and recommendations of the board committees", needs: "تقارير اللجان" },
      { body: "board", keys: ["التقويم", "خطه الاجتماعات", "مواعيد الاجتماعات"], kind: "decision", title: `التصويت على اعتماد التقويم السنوي لاجتماعات المجلس ولجانه لعام ${now + 1}`, en: `Approving the annual calendar of board and committee meetings for ${now + 1}`, needs: "مسودة التقويم (4 اجتماعات على الأقل، واحد كل ربع للشركات المدرجة)" },
      { body: "any", keys: ["ما يستجد", "اخري", "مستجدات"], kind: "discussion", title: "ما يستجد من أعمال", en: "Any other business" },
    ]),
    ...group("التقارير المالية والموازنة", [
      { body: "board", keys: ["القوائم الماليه", "البيانات الماليه", "الحسابات الختاميه", "السنويه"], kind: "decision", title: `التصويت على اعتماد القوائم المالية ${fy}`, en: `Approving the financial statements ${fyEn}`, needs: "توصية لجنة المراجعة؛ تقرير مراجع الحسابات؛ القوائم المالية" },
      { body: "board", keys: ["القوائم الماليه", "البيانات الماليه", "الاوليه", "الربعيه", "الربع"], kind: "decision", title: `التصويت على اعتماد القوائم المالية الأولية الموجزة ${period}`, en: `Approving the condensed interim financial statements ${periodEn}`, needs: "توصية لجنة المراجعة؛ تقرير الفحص من مراجع الحسابات" },
      { body: "board", keys: ["تقرير مجلس الاداره", "التقرير السنوي"], kind: "decision", title: `التصويت على اعتماد تقرير مجلس الإدارة ${fy} ورفعه للجمعية العامة`, en: `Approving the board of directors' report ${fyEn} for submission to the General Assembly`, needs: "مسودة التقرير وفق متطلبات لائحة الحوكمة م87؛ جداول المكافآت" },
      { body: "board", keys: ["تقرير لجنه المراجعه"], kind: "decision", title: `التصويت على اعتماد تقرير لجنة المراجعة ${fy} لعرضه على الجمعية العامة`, en: `Approving the audit committee report ${fyEn} for presentation to the General Assembly`, needs: "تقرير لجنة المراجعة" },
      { body: "board", keys: ["الموازنه", "الميزانيه", "التقديريه"], kind: "decision", title: `التصويت على اعتماد الموازنة التقديرية لعام ${now + 1}`, en: `Approving the budget for ${now + 1}`, needs: "مشروع الموازنة من الإدارة التنفيذية" },
      { body: "board", keys: ["الاداء", "اداء", "مؤشرات"], kind: "discussion", title: `مناقشة تقرير أداء الشركة ${period}`, en: `Discussing the company's performance report ${periodEn}`, needs: "تقرير الأداء ومؤشراته" },
      { body: "board", keys: ["زكاه", "الزكوي", "ضريبه", "الضريبي"], kind: "decision", title: `التصويت على اعتماد الإقرار الزكوي والضريبي ${fy}`, en: `Approving the zakat and tax return ${fyEn}`, needs: "الإقرار؛ رأي المستشار الزكوي" },
      { body: "board", keys: ["زكاه", "تسويه", "هيئه الزكاه", "ربط زكوي"], kind: "decision", title: "التصويت على التسوية مع هيئة الزكاة والضريبة والجمارك بشأن الربط الزكوي/الضريبي للأعوام (…)", en: "Approving the settlement with ZATCA on the zakat/tax assessments for the years (…)", needs: "الربط والاعتراض؛ رأي المستشار؛ الأثر المالي" },
      { body: "board", keys: ["احتياطي", "الاحتياطي", "احتياطيات"], kind: "decision", title: `${ga} بتكوين/استخدام احتياطي (…) ${fy}`, en: `${gaEn} the formation/use of the (…) reserve ${fyEn}`, needs: "القوائم المالية؛ نص النظام الأساس" },
      { body: "board", keys: ["مشاريع راسماليه", "راسماليه", "توسع", "توسعه"], kind: "decision", title: `التصويت على اعتماد خطة المصروفات الرأسمالية لعام ${now + 1} بمبلغ (…) ريال`, en: `Approving the capital expenditure plan for ${now + 1} of SAR (…)`, needs: "دراسات الجدوى؛ مصادر التمويل" },
    ]),
    ...group("المراجعة والأرباح", [
      { body: "board", keys: ["مراجع الحسابات", "المراجع الخارجي", "مراجع"], kind: "decision", title: `${ga} بتعيين مراجع الحسابات من بين المرشحين لفحص ومراجعة القوائم المالية للعام ${now + 1} وتحديد أتعابه`, en: `${gaEn} the appointment of the external auditor from the nominees to review and audit the financial statements for ${now + 1} and determine its fees`, needs: "توصية لجنة المراجعة؛ عروض المراجعين؛ إقرارات الاستقلال" },
      { body: "board", keys: ["توزيع", "الارباح", "ارباح", "نقديه"], kind: "decision", title: `${ga} بتوزيع أرباح نقدية على المساهمين عن العام المالي ${year} بواقع (…) ريال للسهم`, en: `${gaEn} a cash dividend for the financial year ${year} of SAR (…) per share`, needs: "الأرباح القابلة للتوزيع؛ سياسة توزيع الأرباح" },
      { body: "board", keys: ["مرحليه", "توزيع", "ارباح"], kind: "decision", title: `التصويت على توزيع أرباح مرحلية ${period} بناءً على تفويض الجمعية العامة`, en: `Approving an interim dividend ${periodEn} under the General Assembly's authorization`, needs: "قرار الجمعية بالتفويض؛ القوائم المالية الأولية؛ ملاءة السيولة" },
      { body: "board", keys: ["تفويض", "مرحليه"], kind: "decision", title: `${ga} بتفويض مجلس الإدارة بتوزيع أرباح مرحلية للعام المالي ${now + 1}`, en: `${gaEn} authorizing the board to distribute interim dividends for the financial year ${now + 1}` },
      { body: "board", keys: ["الاحقيه", "تاريخ الصرف", "صرف الارباح"], kind: "decision", title: "التصويت على تحديد تاريخ الأحقية وتاريخ صرف الأرباح المعتمدة", en: "Setting the record date and payment date of the approved dividend", needs: "قرار الجمعية؛ الإفصاح الفوري للشركات المدرجة" },
    ]),
    ...group("المجلس والإدارة التنفيذية", [
      { body: "board", keys: ["مكافات", "مكافاه", "المكافات"], kind: "decision", title: `${ga} بصرف مبلغ (…) ريال مكافأة لأعضاء مجلس الإدارة عن العام المالي ${year}`, en: `${gaEn} paying SAR (…) as remuneration to board members for the financial year ${year}`, needs: "توصية لجنة المكافآت؛ حدود النظام الأساس (نظام الشركات م76)" },
      { body: "board", keys: ["الاعمال والعقود", "مصلحه", "ذات علاقه", "ذي علاقه"], kind: "decision", title: `${ga} بالتصويت على الأعمال والعقود التي لعضو مجلس الإدارة (…) مصلحة مباشرة أو غير مباشرة فيها`, en: `${gaEn} voting on the business and contracts in which board member (…) has a direct or indirect interest`, needs: "إفصاح العضو؛ تقرير خاص من مراجع الحسابات؛ مراجعة لجنة المراجعة (بند مستقل لكل عقد)" },
      { body: "board", keys: ["ذات علاقه", "ذي علاقه", "ترخيص", "تعامل"], kind: "decision", title: "التصويت على الترخيص بتعامل مع طرف ذي علاقة في حدود تفويض الجمعية العامة", en: "Authorizing a related-party transaction within the General Assembly's delegation", needs: "قيمة التعامل ونسبته من الإيرادات؛ قرار الجمعية بالتفويض" },
      { body: "board", keys: ["منافس", "منافسه"], kind: "decision", title: `${ga} بالترخيص لعضو مجلس الإدارة (…) بالاشتراك في عمل منافس لأعمال الشركة`, en: `${gaEn} authorizing board member (…) to participate in a business competing with the company`, needs: "إفصاح العضو؛ تقييم المنافسة (لائحة الحوكمة م44)" },
      { body: "board", keys: ["انتخاب", "الدوره القادمه", "دوره المجلس"], kind: "decision", title: `${ga} بانتخاب أعضاء مجلس الإدارة للدورة القادمة`, en: `${gaEn} the election of board members for the next term`, needs: "توصية لجنة الترشيحات؛ إعلان الترشح" },
      { body: "board", keys: ["استقاله", "استقال", "المستقيل"], kind: "decision", title: "التصويت على قبول استقالة عضو مجلس الإدارة (…) اعتباراً من (…)", en: "Accepting the resignation of board member (…) effective (…)", needs: "خطاب الاستقالة" },
      { body: "board", keys: ["شاغر", "المقعد", "بدل", "بدلا", "بديل", "المستقيل", "استقال"], kind: "decision", title: "التصويت على تعيين (…) عضواً في مجلس الإدارة بدلاً من العضو المستقيل (…) لإكمال مدة الدورة، وعرض التعيين على أول جمعية عامة عادية", en: "Appointing (…) as a board member replacing resigned member (…) for the remainder of the term, subject to the next Ordinary General Assembly", needs: "توصية لجنة الترشيحات؛ السيرة الذاتية وإقرار الاستقلال؛ الإبلاغ خلال 15 يوماً (نظام الشركات م69)" },
      { body: "board", keys: ["رئيس المجلس", "نائب الرئيس", "نائبه"], kind: "decision", title: "التصويت على تعيين رئيس مجلس الإدارة ونائبه", en: "Appointing the chairman and vice-chairman of the board" },
      { body: "board", keys: ["امين السر", "امين سر"], kind: "decision", title: "التصويت على تعيين أمين سر مجلس الإدارة وتحديد مكافأته", en: "Appointing the board secretary and determining the remuneration", needs: "السيرة الذاتية (لائحة الحوكمة م36)" },
      { body: "board", keys: ["الرئيس التنفيذي", "التنفيذي"], kind: "decision", title: "التصويت على تعيين الرئيس التنفيذي وتحديد صلاحياته ومكافأته", en: "Appointing the CEO and determining the powers and remuneration", needs: "توصية لجنة الترشيحات والمكافآت" },
      { body: "board", keys: ["استقاله الرئيس التنفيذي", "انهاء خدمات", "انهاء عقد"], kind: "decision", title: "التصويت على قبول استقالة/إنهاء خدمات الرئيس التنفيذي (…) وتكليف (…) بمهامه مؤقتاً", en: "Accepting the resignation/termination of CEO (…) and assigning (…) as acting CEO", needs: "توصية لجنة الترشيحات والمكافآت؛ الإفصاح الفوري للشركات المدرجة" },
      { body: "board", keys: ["المدير المالي", "كبار التنفيذيين", "تعيين مدير"], kind: "decision", title: "التصويت على تعيين (…) في منصب (…) من كبار التنفيذيين", en: "Appointing (…) as (…) among the senior executives", needs: "توصية لجنة الترشيحات والمكافآت؛ السيرة الذاتية" },
      { body: "board", keys: ["متغيب", "انهاء عضويه", "غياب"], kind: "decision", title: `${ga} بإنهاء عضوية العضو (…) لتغيبه عن الاجتماعات`, en: `${gaEn} terminating the membership of (…) for absence from meetings`, needs: "سجل الحضور (نظام الشركات م70)" },
      { body: "board", keys: ["تقييم", "تقييم اداء"], kind: "decision", title: `التصويت على اعتماد نتائج تقييم أداء المجلس ولجانه للعام ${year}`, en: `Approving the results of the board and committees' performance assessment for ${year}`, needs: "تقرير لجنة الترشيحات" },
      { body: "board", keys: ["الهيكل التنظيمي", "هيكل"], kind: "decision", title: "التصويت على اعتماد الهيكل التنظيمي للشركة", en: "Approving the company's organizational structure", needs: "الهيكل الحالي والمقترح؛ الأثر على التكاليف" },
      { body: "board", keys: ["الموارد البشريه", "لائحه شؤون الموظفين", "سلم الرواتب"], kind: "decision", title: "التصويت على اعتماد/تحديث لائحة الموارد البشرية وسلم الرواتب", en: "Approving/updating the HR policy and salary scale", needs: "توصية لجنة المكافآت؛ مقارنة التعديلات" },
      { body: "board", keys: ["حوافز", "مكافات الاداره", "مكافات التنفيذيين"], kind: "decision", title: `التصويت على اعتماد مكافآت الأداء السنوية للإدارة التنفيذية عن العام ${year}`, en: `Approving the annual performance bonuses of the executive management for ${year}`, needs: "توصية لجنة المكافآت؛ نتائج مؤشرات الأداء" },
      { body: "board", keys: ["اسهم الموظفين", "برنامج حوافز", "خطه حوافز"], kind: "decision", title: `${ega} باعتماد برنامج أسهم الموظفين`, en: `${egaEn} approving the employee share program`, needs: "وثيقة البرنامج؛ توصية لجنة المكافآت" },
      { body: "board", keys: ["تعريف", "تدريب", "الاعضاء الجدد"], kind: "decision", title: "التصويت على اعتماد برنامج تعريف الأعضاء الجدد وخطة تدريب أعضاء المجلس", en: "Approving the induction program for new members and the board training plan", needs: "توصية لجنة الترشيحات" },
    ]),
    ...group("اللجان والسياسات والخطط", [
      { body: "board", keys: ["تشكيل", "لجنه", "اللجان"], kind: "decision", title: "التصويت على تشكيل لجان المجلس وتعيين أعضائها وتحديد مهامها ومدتها", en: "Forming the board committees, appointing their members and defining their duties and terms", needs: "توصية لجنة الترشيحات؛ الإبلاغ خلال 5 أيام للشركات المدرجة" },
      { body: "board", keys: ["رئيس لجنه المراجعه", "لجنه المراجعه", "رئيس لجنه"], kind: "decision", title: "التصويت على تعيين (…) رئيساً للجنة المراجعة", en: "Appointing (…) as chair of the audit committee", needs: "توصية لجنة الترشيحات؛ ما يثبت الاستقلال والخبرة المالية" },
      { body: "board", keys: ["عضو لجنه المراجعه", "لجنه المراجعه", "بدل", "المستقيل"], kind: "decision", title: "التصويت على تعيين (…) عضواً في لجنة المراجعة بدلاً من العضو المستقيل (…) لإكمال مدة اللجنة", en: "Appointing (…) as an audit committee member replacing resigned member (…) for the remainder of the term", needs: "توصية لجنة الترشيحات؛ السيرة الذاتية وإقرار الاستقلال" },
      { body: "board", keys: ["رئيس لجنه", "لجنه المكافات", "لجنه الترشيحات", "لجنه المخاطر", "اللجنه التنفيذيه"], kind: "decision", title: "التصويت على تعيين (…) رئيساً للجنة (…)", en: "Appointing (…) as chair of the (…) committee", needs: "توصية لجنة الترشيحات" },
      { body: "board", keys: ["عضو لجنه", "اعضاء لجنه", "بدل", "المستقيل"], kind: "decision", title: "التصويت على تعيين (…) عضواً في لجنة (…) بدلاً من العضو المستقيل (…) لإكمال مدة اللجنة", en: "Appointing (…) as a member of the (…) committee replacing resigned member (…)", needs: "توصية لجنة الترشيحات" },
      { body: "board", keys: ["اعاده تشكيل", "تشكيل لجنه المراجعه"], kind: "decision", title: "التصويت على إعادة تشكيل لجنة المراجعة للدورة الجديدة وتحديد مهامها وضوابط عملها ومكافآت أعضائها", en: "Re-forming the audit committee for the new term and setting its duties, rules and members' remuneration", needs: "توصية لجنة الترشيحات؛ لائحة عمل اللجنة" },
      { body: "board", keys: ["لائحه عمل", "لائحه لجنه"], kind: "decision", title: `${ga} باعتماد لائحة عمل لجنة (…)`, en: `${gaEn} approving the charter of the (…) committee`, needs: "مسودة اللائحة" },
      { body: "board", keys: ["سياسه", "سياسات", "لائحه"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة (…)", en: "Approving/updating the (…) policy", needs: POLICY },
      { body: "board", keys: ["الخطه الاستراتيجيه", "الاستراتيجيه", "استراتيجيه"], kind: "decision", title: `التصويت على اعتماد الخطة الاستراتيجية للأعوام ${now + 1}–${now + 3}`, en: `Approving the strategic plan for ${now + 1}–${now + 3}` },
      { body: "board", keys: ["المراجعه الداخليه", "خطه المراجعه"], kind: "decision", title: `التصويت على اعتماد خطة المراجعة الداخلية لعام ${now + 1}`, en: `Approving the internal audit plan for ${now + 1}`, needs: "توصية لجنة المراجعة" },
      { body: "board", keys: ["المخاطر", "مخاطر"], kind: "discussion", title: "مناقشة تقرير إدارة المخاطر", en: "Discussing the risk management report", needs: "تقرير لجنة/إدارة المخاطر" },
      { body: "board", keys: ["الاحلال", "التعاقب", "خطه الاحلال"], kind: "decision", title: "التصويت على اعتماد خطة الإحلال والتعاقب للمناصب القيادية", en: "Approving the succession plan for leadership positions", needs: "توصية لجنة الترشيحات" },
    ]),
    ...group("الحوكمة والالتزام", [
      { body: "board", keys: ["الالتزام بلائحه الحوكمه", "الحوكمه", "الالتزام"], kind: "decision", title: `التصويت على اعتماد تقرير الالتزام بلائحة حوكمة الشركات ${fy} وأسباب عدم تطبيق ما لم يُطبق من أحكامها`, en: `Approving the corporate governance compliance report ${fyEn}, with reasons for any provision not applied`, needs: "جدول الالتزام بمواد اللائحة (لائحة الحوكمة م87)" },
      { body: "board", keys: ["سياسه الافصاح", "الافصاح"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة الإفصاح والشفافية", en: "Approving/updating the disclosure and transparency policy", needs: POLICY },
      { body: "board", keys: ["تعارض المصالح", "سياسه تعارض"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة تعارض المصالح", en: "Approving/updating the conflict of interest policy", needs: `${POLICY} (لائحة الحوكمة م41)` },
      { body: "board", keys: ["المخالفات", "الابلاغ", "بلاغات"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة الإبلاغ عن المخالفات وحماية المبلّغين", en: "Approving/updating the whistleblowing policy", needs: POLICY },
      { body: "board", keys: ["ميثاق", "السلوك", "قواعد السلوك"], kind: "decision", title: "التصويت على اعتماد/تحديث ميثاق السلوك المهني والأخلاقي", en: "Approving/updating the code of conduct", needs: "مسودة الميثاق" },
      { body: "board", keys: ["سياسه توزيع الارباح"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة توزيع الأرباح", en: "Approving/updating the dividend policy", needs: POLICY },
      { body: "board", keys: ["اصحاب المصالح"], kind: "decision", title: "التصويت على اعتماد/تحديث سياسة العلاقة مع أصحاب المصالح", en: "Approving/updating the stakeholder relations policy", needs: POLICY },
      { body: "board", keys: ["البيانات الشخصيه", "حمايه البيانات", "الخصوصيه"], kind: "decision", title: "التصويت على اعتماد سياسة حماية البيانات الشخصية", en: "Approving the personal data protection policy", needs: `${POLICY}؛ متطلبات نظام حماية البيانات الشخصية` },
      { body: "board", keys: ["استمراريه الاعمال", "الطوارئ"], kind: "decision", title: "التصويت على اعتماد خطة استمرارية الأعمال", en: "Approving the business continuity plan", needs: "الخطة؛ نتائج آخر اختبار" },
      { body: "board", keys: ["مخالفه", "غرامه", "جزاء", "عقوبه"], kind: "information", title: "الاطلاع على المخالفات والغرامات النظامية المفروضة على الشركة والإجراءات المتخذة", en: "Reviewing regulatory violations and penalties imposed on the company and the actions taken", needs: "بيان المخالفات؛ رأي الإدارة القانونية" },
    ]),
    ...group("العقود والتمويل والاستثمار", [
      { body: "board", keys: ["عقد", "توقيع عقد", "ترسيه", "اتفاقيه"], kind: "decision", title: "التصويت على الموافقة على توقيع عقد (…) مع (…) بقيمة (…) ريال ولمدة (…)", en: "Approving the signing of a (…) contract with (…) of SAR (…) for (…)", needs: "مسودة العقد؛ المراجعة القانونية؛ الأثر المالي؛ التحقق من عدم وجود مصلحة لعضو" },
      { body: "board", keys: ["تجديد", "عقد", "اتفاقيه"], kind: "decision", title: "التصويت على تجديد عقد/اتفاقية (…) مع (…) لمدة (…)", en: "Renewing the (…) contract/agreement with (…) for (…)", needs: "تقييم أداء الطرف الآخر؛ الشروط المعدلة" },
      { body: "board", keys: ["مناقصه", "ترسيه", "عروض"], kind: "decision", title: "التصويت على ترسية مناقصة (…) على (…) بقيمة (…) ريال", en: "Awarding the (…) tender to (…) for SAR (…)", needs: "محضر لجنة فحص العروض؛ مقارنة العروض" },
      { body: "board", keys: ["مذكره تفاهم", "تفاهم"], kind: "decision", title: "التصويت على الموافقة على توقيع مذكرة تفاهم غير ملزمة مع (…) بشأن (…)", en: "Approving the signing of a non-binding memorandum of understanding with (…) regarding (…)", needs: "مسودة المذكرة؛ تقييم الإفصاح إن كانت جوهرية" },
      { body: "board", keys: ["شراكه", "مشروع مشترك", "تحالف"], kind: "decision", title: "التصويت على الموافقة على الدخول في اتفاقية شراكة/مشروع مشترك مع (…)", en: "Approving entry into a partnership/joint venture agreement with (…)", needs: "دراسة الجدوى؛ المراجعة القانونية؛ هيكل الملكية" },
      { body: "board", keys: ["تسهيلات", "قرض", "قروض", "تمويل", "بنك"], kind: "decision", title: "التصويت على الموافقة على توقيع اتفاقية تسهيلات ائتمانية متوافقة مع أحكام الشريعة مع (…) بمبلغ (…) ريال ولمدة (…)", en: "Approving a Sharia-compliant credit facility agreement with (…) of SAR (…) for (…)", needs: "عرض الجهة الممولة؛ الضمانات المطلوبة؛ الأثر على السيولة والتعهدات المالية" },
      { body: "board", keys: ["تجديد", "تسهيلات", "قرض", "اعاده تمويل", "جدوله"], kind: "decision", title: "التصويت على تجديد/إعادة جدولة التسهيلات الائتمانية القائمة مع (…)", en: "Renewing/rescheduling the existing credit facilities with (…)", needs: "الشروط الحالية والمقترحة" },
      { body: "board", keys: ["ضمان", "كفاله", "سند لامر", "تابعه"], kind: "decision", title: "التصويت على تقديم ضمان/كفالة تضامنية لصالح (…) لتسهيلات الشركة التابعة (…) بمبلغ (…) ريال", en: "Providing a guarantee in favour of (…) for the facilities of subsidiary (…) of SAR (…)", needs: "حجم الالتزام؛ الوضع المالي للشركة التابعة" },
      { body: "board", keys: ["رهن", "ضمانات", "اصول"], kind: "decision", title: "التصويت على رهن (…) ضماناً لتسهيلات (…)", en: "Pledging (…) as security for the (…) facilities", needs: "تقييم الأصل؛ شروط الرهن" },
      { body: "board", keys: ["صكوك", "ادوات دين", "سندات"], kind: "decision", title: "التصويت على إصدار صكوك/أدوات دين بقيمة (…) ريال", en: "Issuing sukuk/debt instruments of SAR (…)", needs: "المستشار المالي؛ هيكل الإصدار؛ الموافقات النظامية" },
      { body: "board", keys: ["استحواذ", "شراء حصه", "تملك"], kind: "decision", title: "التصويت على الاستحواذ على (…)% من حصص/أسهم شركة (…) بقيمة (…) ريال", en: "Acquiring (…)% of the shares of (…) for SAR (…)", needs: "الفحص النافي للجهالة؛ التقييم المستقل؛ المراجعة القانونية" },
      { body: "board", keys: ["استثمار", "محفظه", "ودائع"], kind: "decision", title: "التصويت على استثمار مبلغ (…) ريال في (…)", en: "Investing SAR (…) in (…)", needs: "سياسة الاستثمار؛ تقييم المخاطر والعائد" },
      { body: "board", keys: ["عقار", "ارض", "شراء", "بيع"], kind: "decision", title: "التصويت على شراء/بيع العقار (…) بقيمة (…) ريال", en: "Purchasing/selling the property (…) for SAR (…)", needs: "تقييم من مقيّم معتمد؛ المراجعة القانونية للصك" },
      { body: "board", keys: ["ديون", "شطب", "معدومه", "اعفاء"], kind: "decision", title: "التصويت على شطب ديون معدومة بقيمة (…) ريال", en: "Writing off bad debts of SAR (…)", needs: "تقرير التحصيل؛ رأي مراجع الحسابات" },
      { body: "board", keys: ["دعوي", "نزاع", "تسويه", "قضيه"], kind: "decision", title: "التصويت على تسوية النزاع/الدعوى (…) مع (…)", en: "Settling the dispute/lawsuit (…) with (…)", needs: "رأي المستشار القانوني؛ الأثر المالي" },
      { body: "board", keys: ["تبرع", "تبرعات", "المسؤوليه الاجتماعيه"], kind: "decision", title: "التصويت على اعتماد برنامج المسؤولية الاجتماعية/التبرعات لعام (…) بمبلغ (…) ريال", en: "Approving the social responsibility/donations program for (…) of SAR (…)", needs: "سياسة المسؤولية الاجتماعية" },
    ]),
    ...group("البنوك والتفويضات والشركات التابعة", [
      { body: "board", keys: ["حساب بنكي", "حسابات بنكيه", "فتح حساب", "اغلاق حساب"], kind: "decision", title: "التصويت على فتح/إغلاق حساب بنكي لدى (…)", en: "Opening/closing a bank account with (…)", needs: "الغرض من الحساب" },
      { body: "board", keys: ["المفوضين", "التوقيع البنكي", "صلاحيات التوقيع"], kind: "decision", title: "التصويت على تحديد المفوضين بالتوقيع على الحسابات البنكية وحدود صلاحياتهم", en: "Designating the authorized bank signatories and their limits", needs: "جدول الصلاحيات؛ أسماء المفوضين" },
      { body: "board", keys: ["تفويض", "توقيع", "نيابه"], kind: "decision", title: "التصويت على تفويض (…) بتوقيع (…) نيابة عن الشركة", en: "Authorizing (…) to sign (…) on behalf of the company", needs: "حدود التفويض ومدته" },
      { body: "board", keys: ["جدول الصلاحيات", "مصفوفه الصلاحيات", "الصلاحيات"], kind: "decision", title: "التصويت على اعتماد/تحديث جدول الصلاحيات المالية والإدارية", en: "Approving/updating the financial and administrative delegation of authority", needs: "الجدول الحالي والمقترح مع المقارنة" },
      { body: "board", keys: ["وكاله", "الجهات الحكوميه", "تفويض حكومي"], kind: "decision", title: "التصويت على إصدار وكالة/تفويض لـ(…) لتمثيل الشركة أمام (…)", en: "Issuing a power of attorney to (…) to represent the company before (…)", needs: "نطاق الوكالة ومدتها" },
      { body: "board", keys: ["مستشار", "استشاري", "مكتب محاماه"], kind: "decision", title: "التصويت على تعيين (…) مستشاراً (قانونياً/مالياً) للشركة بشأن (…)", en: "Appointing (…) as the company's (legal/financial) adviser on (…)", needs: "العروض؛ نطاق العمل والأتعاب" },
      { body: "board", keys: ["تاسيس", "شركه تابعه", "فرع"], kind: "decision", title: "التصويت على تأسيس شركة تابعة/فتح فرع باسم (…) برأس مال (…) ريال", en: "Establishing a subsidiary/branch named (…) with capital of SAR (…)", needs: "دراسة الجدوى؛ هيكل الملكية" },
      { body: "board", keys: ["ممثلي الشركه", "مجالس الشركات التابعه", "ممثل"], kind: "decision", title: "التصويت على تعيين ممثلي الشركة في مجلس إدارة الشركة التابعة (…)", en: "Appointing the company's representatives on the board of subsidiary (…)", needs: "السير الذاتية" },
      { body: "board", keys: ["تصفيه", "شركه تابعه", "دمج تابعه"], kind: "decision", title: "التصويت على تصفية/دمج الشركة التابعة (…)", en: "Liquidating/merging subsidiary (…)", needs: "الأثر المالي والقانوني" },
    ]),
    ...group("رأس المال والجمعيات", [
      { body: "board", keys: ["النظام الاساس", "تعديل النظام"], kind: "decision", title: `${ega} بتعديل النظام الأساس للشركة`, en: `${egaEn} amending the company's bylaws`, needs: "مسودة التعديلات والمقارنة؛ رأي قانوني" },
      { body: "board", keys: ["راس المال", "زياده", "تخفيض"], kind: "decision", title: `${ega} بزيادة/تخفيض رأس مال الشركة`, en: `${egaEn} increasing/reducing the company's capital`, needs: "بيان المجلس؛ تقرير مراجع الحسابات (نظام الشركات م127/م134)" },
      { body: "board", keys: ["شراء اسهم", "اسهم الخزينه", "اسهمها"], kind: "decision", title: `${ega} بشراء الشركة لعدد (…) من أسهمها`, en: `${egaEn} the purchase by the company of (…) of its shares`, needs: "تقرير ملاءة من مراجع الحسابات؛ نص النظام الأساس" },
      { body: "board", keys: ["بيع اصول", "الاصول"], kind: "decision", title: `${ga} ببيع أصول تتجاوز قيمتها 50% من إجمالي أصول الشركة`, en: `${gaEn} the sale of assets exceeding 50% of the company's total assets`, needs: "تقييم الأصول (نظام الشركات م75)" },
      { body: "board", keys: ["الخسائر", "نصف راس المال"], kind: "decision", title: `${ega} بشأن استمرار الشركة أو حلها لبلوغ الخسائر نصف رأس المال`, en: `${egaEn} on the continuation or dissolution of the company as losses reached half the capital`, needs: "القوائم المالية؛ الإعلان خلال 60 يوماً (نظام الشركات م132)" },
      { body: "board", keys: ["الجمعيه", "دعوه", "الجمعيه العامه"], kind: "decision", title: "التصويت على دعوة الجمعية العامة للانعقاد واعتماد جدول أعمالها", en: "Calling the General Assembly and approving its agenda", needs: "مسودة الدعوة وجدول الأعمال (21 يوماً على الأقل؛ بند مستقل لكل عقد فيه مصلحة)" },
      { body: "board", keys: ["قرارات الجمعيه", "نتائج الجمعيه", "متابعه الجمعيه"], kind: "information", title: "متابعة تنفيذ قرارات الجمعية العامة الأخيرة", en: "Follow-up on the resolutions of the last General Assembly", needs: "محضر الجمعية؛ الإفصاح عن النتائج" },
      { body: "board", keys: ["اعاده الدعوه", "النصاب", "الاجتماع الثاني"], kind: "decision", title: "التصويت على الدعوة لاجتماع ثانٍ للجمعية العامة لعدم اكتمال النصاب", en: "Calling a second General Assembly meeting as quorum was not met", needs: "محضر عدم اكتمال النصاب" },
    ]),
    ...group("اجتماعات لجنة المراجعة", [
      { body: "audit", keys: ["القوائم الماليه", "الاوليه", "الربع", "توصيه"], kind: "decision", title: `مراجعة القوائم المالية الأولية ${period} والتوصية للمجلس باعتمادها`, en: `Reviewing the interim financial statements ${periodEn} and recommending them to the board`, needs: "القوائم؛ تقرير الفحص؛ ملاحظات المراجع (لائحة الحوكمة م52)" },
      { body: "audit", keys: ["القوائم الماليه", "السنويه", "توصيه"], kind: "decision", title: `مراجعة القوائم المالية السنوية ${fy} والتوصية للمجلس باعتمادها`, en: `Reviewing the annual financial statements ${fyEn} and recommending them to the board`, needs: "القوائم؛ تقرير مراجع الحسابات؛ خطاب الإدارة" },
      { body: "audit", keys: ["المراجع الخارجي", "بدون حضور الاداره", "اجتماع مع المراجع"], kind: "discussion", title: "الاجتماع مع مراجع الحسابات الخارجي دون حضور الإدارة التنفيذية", en: "Meeting the external auditor without the executive management", needs: "خطة المراجعة ونتائجها" },
      { body: "audit", keys: ["خطاب الاداره", "ملاحظات المراجع"], kind: "discussion", title: "مناقشة خطاب الإدارة الصادر من مراجع الحسابات ومتابعة معالجة ملاحظاته", en: "Discussing the external auditor's management letter and follow-up of its findings", needs: "خطاب الإدارة؛ ردود الإدارة وخطط المعالجة" },
      { body: "audit", keys: ["ترشيح المراجع", "مراجع الحسابات", "عروض المراجعين", "استقلال"], kind: "decision", title: `دراسة عروض مراجعي الحسابات والتوصية للمجلس بترشيح مراجع الحسابات للعام ${now + 1} وأتعابه`, en: `Evaluating external audit proposals and recommending the auditor for ${now + 1} and its fees to the board`, needs: "العروض الفنية والمالية؛ إقرارات الاستقلال؛ مدة المراجع الحالي (7 سنوات حداً أقصى للمدرجة)" },
      { body: "audit", keys: ["المراجعه الداخليه", "تقرير المراجعه", "تقارير المراجعه"], kind: "discussion", title: `مناقشة تقارير المراجعة الداخلية ${period} ومتابعة الملاحظات`, en: `Discussing the internal audit reports ${periodEn} and follow-up of findings`, needs: "تقارير المراجعة الداخلية؛ سجل متابعة الملاحظات" },
      { body: "audit", keys: ["خطه المراجعه", "المراجعه الداخليه"], kind: "decision", title: `اعتماد خطة المراجعة الداخلية لعام ${now + 1} والتوصية بها للمجلس`, en: `Approving the internal audit plan for ${now + 1} and recommending it to the board`, needs: "الخطة المبنية على المخاطر؛ الموارد" },
      { body: "audit", keys: ["مدير المراجعه", "رئيس المراجعه"], kind: "decision", title: "التوصية للمجلس بتعيين/عزل مدير إدارة المراجعة الداخلية وتحديد مكافأته", en: "Recommending to the board the appointment/removal of the head of internal audit and the remuneration", needs: "السيرة الذاتية؛ تقييم الأداء (لائحة الحوكمة م52)" },
      { body: "audit", keys: ["ذات علاقه", "ذي علاقه", "تعاملات"], kind: "decision", title: "مراجعة التعاملات مع الأطراف ذات العلاقة ورفع التوصيات للمجلس", en: "Reviewing related-party transactions and recommending to the board", needs: "بيان التعاملات وقيمها وشروطها" },
      { body: "audit", keys: ["الالتزام", "تقرير الالتزام"], kind: "discussion", title: `مناقشة تقرير إدارة الالتزام ${period}`, en: `Discussing the compliance report ${periodEn}`, needs: "تقرير الالتزام" },
      { body: "audit", keys: ["بلاغات", "المخالفات", "الاحتيال"], kind: "discussion", title: "مناقشة البلاغات الواردة عن المخالفات والإجراءات المتخذة بشأنها", en: "Discussing whistleblowing reports and the actions taken", needs: "سجل البلاغات (دون كشف هوية المبلّغين)" },
      { body: "audit", keys: ["السياسات المحاسبيه", "التقديرات"], kind: "decision", title: "مراجعة السياسات والتقديرات المحاسبية الجوهرية وإبداء التوصية للمجلس", en: "Reviewing significant accounting policies and estimates and recommending to the board", needs: "مذكرة الإدارة المالية؛ رأي المراجع" },
      { body: "audit", keys: ["تقرير اللجنه", "تقرير لجنه المراجعه"], kind: "decision", title: `اعتماد تقرير لجنة المراجعة ${fy} لرفعه للمجلس والجمعية العامة`, en: `Approving the audit committee report ${fyEn} for the board and the General Assembly`, needs: "مسودة التقرير (لائحة الحوكمة م88)" },
    ]),
    ...group("اجتماعات لجنة الترشيحات والمكافآت", [
      { body: "nrc", keys: ["استقلال", "الاعضاء المستقلين"], kind: "decision", title: `التحقق السنوي من استقلال الأعضاء المستقلين للعام ${now}`, en: `Annual verification of the independence of independent directors for ${now}`, needs: "إقرارات الاستقلال المحدّثة" },
      { body: "nrc", keys: ["المهارات", "احتياجات المجلس", "مصفوفه"], kind: "discussion", title: "مراجعة هيكل المجلس ومصفوفة المهارات المطلوبة ورفع التوصيات", en: "Reviewing the board structure and skills matrix and recommending changes", needs: "مصفوفة المهارات الحالية" },
      { body: "nrc", keys: ["ترشيح", "المرشحين", "عضويه المجلس"], kind: "decision", title: "دراسة المرشحين لعضوية مجلس الإدارة والتوصية للمجلس", en: "Evaluating candidates for board membership and recommending to the board", needs: "طلبات الترشح؛ السير الذاتية؛ إعلان الترشح (شهر على الأقل)" },
      { body: "nrc", keys: ["مكافات", "مكافات الاداره", "التنفيذيين"], kind: "decision", title: `مراجعة مكافآت الإدارة التنفيذية عن العام ${year} والتوصية للمجلس`, en: `Reviewing the executive management remuneration for ${year} and recommending to the board`, needs: "سياسة المكافآت؛ نتائج مؤشرات الأداء" },
      { body: "nrc", keys: ["مكافات المجلس", "مكافات الاعضاء"], kind: "decision", title: `التوصية للمجلس بمكافآت أعضاء المجلس واللجان عن العام ${year}`, en: `Recommending to the board the remuneration of board and committee members for ${year}`, needs: "سياسة المكافآت؛ حدود النظام الأساس (نظام الشركات م76)" },
      { body: "nrc", keys: ["سياسه المكافات"], kind: "decision", title: "مراجعة سياسة المكافآت والتوصية للمجلس بتحديثها", en: "Reviewing the remuneration policy and recommending updates to the board", needs: "السياسة الحالية؛ مقارنة السوق" },
      { body: "nrc", keys: ["الاحلال", "التعاقب"], kind: "decision", title: "مراجعة خطة الإحلال والتعاقب للمناصب القيادية والتوصية للمجلس", en: "Reviewing the succession plan for leadership positions and recommending to the board", needs: "الخطة الحالية؛ تقييم المرشحين الداخليين" },
      { body: "nrc", keys: ["تقييم", "تقييم الاداء"], kind: "decision", title: `الإشراف على تقييم أداء المجلس ولجانه للعام ${year} ورفع النتائج`, en: `Overseeing the board and committees' performance assessment for ${year} and reporting the results`, needs: "نماذج التقييم؛ تقييم خارجي كل 3 سنوات" },
    ]),
    ...group("اجتماعات لجنة المخاطر", [
      { body: "risk", keys: ["سجل المخاطر", "المخاطر"], kind: "discussion", title: `مراجعة سجل المخاطر ومؤشراتها ${period}`, en: `Reviewing the risk register and indicators ${periodEn}`, needs: "سجل المخاطر المحدّث" },
      { body: "risk", keys: ["قبول المخاطر", "شهيه المخاطر"], kind: "decision", title: "مراجعة مستوى قبول المخاطر والتوصية للمجلس باعتماده", en: "Reviewing the risk appetite and recommending it to the board", needs: "بيان مستوى قبول المخاطر" },
      { body: "risk", keys: ["الامن السيبراني", "سيبراني", "امن المعلومات"], kind: "discussion", title: "مناقشة تقرير الأمن السيبراني وأمن المعلومات", en: "Discussing the cybersecurity and information security report", needs: "تقرير الأمن السيبراني؛ نتائج الاختبارات" },
      { body: "risk", keys: ["استمراريه الاعمال", "الطوارئ"], kind: "discussion", title: "مراجعة جاهزية خطة استمرارية الأعمال ونتائج اختبارها", en: "Reviewing business continuity readiness and test results", needs: "نتائج آخر اختبار" },
      { body: "risk", keys: ["سياسه المخاطر", "اداره المخاطر"], kind: "decision", title: "مراجعة سياسة إدارة المخاطر والتوصية للمجلس بتحديثها", en: "Reviewing the risk management policy and recommending updates to the board", needs: "السياسة الحالية والمقترحة" },
    ]),
  ];
}
