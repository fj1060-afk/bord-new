// The built-in library of standard agenda items (Saudi market practice).
// References were checked against the Companies Law, the CMA Corporate
// Governance Regulations, the CMA Implementing Regulation for listed companies
// ("اللائحة التنفيذية للمدرجة") and the CMA continuing obligations rules
// ("قواعد الطرح"); see docs/GOVERNANCE-RULES.md.
// Each item lists its requirements as actions (see ./requirements); `needs`
// is derived from them for the parts of the app that show a plain line.

import { partTwo } from "./item-templates-data-2";
import { partThree } from "./item-templates-data-3";
import { after, chk, disclose, doc, ega, egaEn, fy, fyEn, ga, gaEn, noInterest, period, periodEn, rec } from "./item-templates-kit";
import { needsText, needsTextEn, type Req } from "./requirements";

export type Kind = "information" | "discussion" | "decision";
/** Which meeting an item belongs to; "any" fits every board or committee meeting. */
export type Body = "board" | "audit" | "nrc" | "risk" | "any";
export type Template = { category: string; body: Body; keys: string[]; title: string; en?: string; kind: Kind; reqs?: Req[]; needs?: string; needsEn?: string };

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

export type Category = (typeof CATEGORIES)[number];
/** A library item as written: its category comes from its group and `needs` from its requirements. */
export type Item = Omit<Template, "category" | "needs" | "needsEn">;
/** Groups of items kept in the other data files. */
export type Part = [Category, Item[]][];

const group = (category: Category, items: Item[]): Template[] =>
  items.map((i) => ({ category, ...i, needs: needsText(i.reqs) || undefined, needsEn: needsTextEn(i.reqs) || undefined }));

export function buildTemplates(): Template[] {
  return [
    ...group("الاجتماعات والمحاضر", [
      { body: "any", keys: ["جدول الاعمال", "جدول اعمال"], kind: "decision", title: "التصويت على اعتماد جدول أعمال الاجتماع", en: "Approving the meeting agenda", reqs: [
        doc("مسودة جدول الأعمال المرسلة مع الدعوة قبل 5 أيام على الأقل مع مستنداتها (لائحة الحوكمة م30)", "Draft agenda sent with the invitation and its documents at least 5 days before the meeting (CGR Art. 30)", "secretary"),
        doc("البنود الإضافية التي يقترحها الأعضاء", "Additional items proposed by members", "secretary"),
        after("إثبات أي اعتراض في المحضر (لائحة الحوكمة م33)", "Record any objection in the minutes (CGR Art. 33)", undefined, "secretary"),
      ] },
      { body: "any", keys: ["المحضر", "محضر", "الاجتماع السابق"], kind: "decision", title: "التصويت على اعتماد محضر الاجتماع السابق", en: "Approving the minutes of the previous meeting", reqs: [
        doc("مسودة المحضر المعمّمة على الأعضاء", "Draft minutes circulated to members", "secretary"),
        doc("ملاحظات الأعضاء على المسودة", "Members' comments on the draft", "secretary"),
        after("توقيع المحضر من رئيس الاجتماع والأعضاء الحاضرين وأمين السر وقيده في السجل الخاص (نظام الشركات م83)", "Minutes signed by the chair, attending members and the secretary and entered in the minutes register (Companies Law Art. 83)", undefined, "secretary"),
      ] },
      { body: "any", keys: ["متابعه", "القرارات السابقه", "تنفيذ القرارات"], kind: "information", title: "متابعة تنفيذ القرارات السابقة", en: "Follow-up on the implementation of previous resolutions", reqs: [
        doc("سجل متابعة القرارات محدّثاً (الجهة المسؤولة، الموعد، نسبة الإنجاز)", "Updated resolutions tracker (owner, due date, progress)", "secretary"),
        doc("مبررات التأخير والإجراءات التصحيحية", "Reasons for delays and corrective actions"),
        doc("القرارات المقترح إغلاقها", "Resolutions proposed for closure", "secretary"),
      ] },
      { body: "board", keys: ["التمرير", "بالتمرير"], kind: "decision", title: "إثبات قرارات المجلس الصادرة بالتمرير منذ الاجتماع السابق", en: "Recording the board resolutions passed by circulation since the previous meeting", reqs: [
        doc("نسخ القرارات ونتائج التصويت (نظام الشركات م82)", "Copies of the resolutions and voting results (Companies Law Art. 82)", "secretary"),
        chk("التحقق من تعميم القرارات على جميع الأعضاء وعدم طلب أي عضو مداولتها في اجتماع", "Confirm the resolutions were circulated to all members and no member asked for them to be deliberated in a meeting"),
        after("قيد القرارات في محضر هذا الاجتماع", "Record the resolutions in this meeting's minutes", undefined, "secretary"),
      ] },
      { body: "any", keys: ["تعارض", "الافصاح عن"], kind: "information", title: "إفصاح الأعضاء عن تعارض المصالح في بنود الاجتماع", en: "Members' disclosure of conflicts of interest in the agenda items", reqs: [
        doc("سجل الإفصاحات (نظام الشركات م71)", "Disclosure register (Companies Law Art. 71)", "secretary"),
        doc("إقرارات الأعضاء المحدّثة عن مصالحهم في بنود الاجتماع", "Members' updated declarations of their interests in the agenda items", "secretary"),
        noInterest("إثبات الإفصاح في المحضر واستبعاد العضو صاحب المصلحة من المداولة والتصويت (لائحة الحوكمة م42)", "Record the disclosure in the minutes and exclude the interested member from deliberation and voting (CGR Art. 42)"),
      ] },
      { body: "board", keys: ["تقرير الرئيس التنفيذي", "الرئيس التنفيذي", "تقرير الاداره"], kind: "information", title: `الاطلاع على تقرير الرئيس التنفيذي عن أداء الشركة ${period}`, en: `Reviewing the CEO's report on the company's performance ${periodEn}`, reqs: [
        doc("تقرير الرئيس التنفيذي (الأداء المالي والتشغيلي مقارنة بالموازنة، مؤشرات الأداء، المشاريع الرئيسة، المخاطر والمستجدات الجوهرية)", "CEO's report (financial and operational performance against budget, KPIs, major projects, risks and material developments)"),
      ] },
      { body: "any", keys: ["تقارير اللجان", "تقرير اللجان"], kind: "information", title: "الاطلاع على تقارير لجان المجلس وتوصياتها", en: "Reviewing the reports and recommendations of the board committees", reqs: [
        doc("تقارير اللجان ومحاضر اجتماعاتها منذ آخر اجتماع للمجلس (لائحة الحوكمة م47)", "Committee reports and minutes since the last board meeting (CGR Art. 47)", "secretary"),
        doc("التوصيات المرفوعة للمجلس وما يتطلب منها قراراً", "Recommendations submitted to the board and those requiring a resolution", "secretary"),
      ] },
      { body: "board", keys: ["التقويم", "خطه الاجتماعات", "مواعيد الاجتماعات"], kind: "decision", title: `التصويت على اعتماد التقويم السنوي لاجتماعات المجلس ولجانه لعام (…)`, en: `Approving the annual calendar of board and committee meetings for (…)`, reqs: [
        doc("مسودة التقويم (4 اجتماعات على الأقل، واحد كل ربع للشركات المدرجة)", "Draft calendar (at least 4 meetings, one per quarter for listed companies)", "secretary"),
        chk("مواءمة التقويم مع مواعيد إعلان النتائج المالية والجمعية العامة واجتماعات اللجان (لائحة الحوكمة م30)", "Calendar aligned with financial results announcements, the General Assembly and committee meetings (CGR Art. 30)"),
      ] },
      { body: "any", keys: ["ما يستجد", "اخري", "مستجدات"], kind: "discussion", title: "ما يستجد من أعمال", en: "Any other business" },
    ]),
    ...group("التقارير المالية والموازنة", [
      { body: "board", keys: ["القوائم الماليه", "البيانات الماليه", "الحسابات الختاميه", "السنويه"], kind: "decision", title: `التصويت على اعتماد القوائم المالية ${fy}`, en: `Approving the financial statements ${fyEn}`, reqs: [
        rec("توصية لجنة المراجعة", "Audit committee recommendation", "audit"),
        doc("تقرير مراجع الحسابات", "External auditor's report", "finance"),
        doc("القوائم المالية", "Financial statements", "finance"),
        doc("خطاب الإدارة", "Management letter", "finance"),
        after("توقيع القوائم من رئيس المجلس والرئيس التنفيذي والمدير المالي (نظام الشركات م121)", "Statements signed by the chairman, CEO and CFO (Companies Law Art. 121)", undefined, "secretary"),
        after("الإفصاح في تداول فور الاعتماد للمدرجة (قواعد الطرح م81)", "Disclosure on Tadawul immediately upon approval (listed companies; OSCOs Art. 81)", "immediate", "ir"),
      ] },
      { body: "board", keys: ["القوائم الماليه", "البيانات الماليه", "الاوليه", "الربعيه", "الربع"], kind: "decision", title: `التصويت على اعتماد القوائم المالية الأولية الموجزة ${period}`, en: `Approving the condensed interim financial statements ${periodEn}`, reqs: [
        rec("توصية لجنة المراجعة", "Audit committee recommendation", "audit"),
        doc("تقرير الفحص من مراجع الحسابات", "External auditor's review report", "finance"),
        doc("القوائم المالية الأولية الموجزة", "Condensed interim financial statements", "finance"),
        after("تفويض عضو بالتوقيع مع الرئيس التنفيذي والمدير المالي", "Authorize a board member to sign with the CEO and CFO", undefined, "secretary"),
        after("الإفصاح في تداول خلال 30 يوماً من نهاية الفترة (قواعد الطرح م81)", "Disclosure on Tadawul within 30 days of the period end (OSCOs Art. 81)", "30d", "ir"),
      ] },
      { body: "board", keys: ["تقرير مجلس الاداره", "التقرير السنوي"], kind: "decision", title: `التصويت على اعتماد تقرير مجلس الإدارة ${fy} ورفعه للجمعية العامة`, en: `Approving the board of directors' report ${fyEn} for submission to the General Assembly`, reqs: [
        doc("مسودة التقرير وفق متطلبات لائحة الحوكمة م87", "Draft report meeting the requirements of CGR Art. 87"),
        doc("جداول المكافآت (لائحة الحوكمة م90)", "Remuneration tables (CGR Art. 90)", "hr"),
        doc("مقترح توزيع الأرباح (نظام الشركات م121)", "Proposed dividend distribution (Companies Law Art. 121)", "finance"),
        after("إتاحة التقرير للمساهمين قبل الجمعية بـ21 يوماً على الأقل (نظام الشركات م122)", "Make the report available to shareholders at least 21 days before the General Assembly (Companies Law Art. 122)", "before_ga", "ir"),
      ] },
      { body: "board", keys: ["تقرير لجنه المراجعه"], kind: "decision", title: `التصويت على اعتماد تقرير لجنة المراجعة ${fy} لعرضه على الجمعية العامة`, en: `Approving the audit committee report ${fyEn} for presentation to the General Assembly`, reqs: [
        doc("تقرير لجنة المراجعة متضمناً رأيها في كفاية أنظمة الرقابة الداخلية والمالية وإدارة المخاطر (لائحة الحوكمة م88)", "Audit committee report including its opinion on the adequacy of internal, financial and risk controls (CGR Art. 88)", "audit"),
        after("نشر التقرير على موقعي الشركة وتداول مع دعوة الجمعية", "Publish the report on the company website and Tadawul with the General Assembly invitation", "before_ga", "ir"),
      ] },
      { body: "board", keys: ["الموازنه", "الميزانيه", "التقديريه"], kind: "decision", title: `التصويت على اعتماد الموازنة التقديرية لعام (…)`, en: `Approving the budget for (…)`, reqs: [
        doc("مشروع الموازنة من الإدارة التنفيذية", "Draft budget from the executive management", "finance"),
        doc("الافتراضات الرئيسة", "Key assumptions", "finance"),
        doc("المقارنة بالمتوقع للعام الحالي", "Comparison with the current year's forecast", "finance"),
        doc("توقعات التدفقات النقدية والتمويل", "Cash flow and funding projections", "finance"),
        chk("مواءمة الموازنة مع الخطة الاستراتيجية", "Budget aligned with the strategic plan"),
        rec("توصية اللجنة التنفيذية (إن وجدت)", "Executive committee recommendation (if any)"),
      ] },
      { body: "board", keys: ["الاداء", "اداء", "مؤشرات"], kind: "discussion", title: `مناقشة تقرير أداء الشركة ${period}`, en: `Discussing the company's performance report ${periodEn}`, reqs: [
        doc("تقرير الأداء ومؤشراته مقارنة بالموازنة والفترة المماثلة", "Performance report and KPIs against budget and the same period last year"),
        doc("تحليل الانحرافات الجوهرية وأسبابها", "Analysis of material variances and their causes"),
        doc("الإجراءات التصحيحية المقترحة", "Proposed corrective actions"),
      ] },
      { body: "board", keys: ["زكاه", "الزكوي", "ضريبه", "الضريبي"], kind: "decision", title: `التصويت على اعتماد الإقرار الزكوي والضريبي ${fy}`, en: `Approving the zakat and tax return ${fyEn}`, reqs: [
        doc("الإقرار الزكوي والضريبي", "Zakat and tax return", "finance"),
        doc("رأي المستشار الزكوي", "Zakat adviser's opinion", "finance"),
        doc("القوائم المالية المعتمدة التي بُني عليها", "Approved financial statements the return is based on", "finance"),
        doc("المقارنة بالسنة السابقة وبالمخصص المكوّن", "Comparison with the prior year and the recorded provision", "finance"),
        after("التقديم لهيئة الزكاة والضريبة والجمارك في الموعد النظامي", "File with ZATCA by the statutory deadline", undefined, "finance"),
      ] },
      { body: "board", keys: ["زكاه", "تسويه", "هيئه الزكاه", "ربط زكوي"], kind: "decision", title: "التصويت على التسوية مع هيئة الزكاة والضريبة والجمارك بشأن الربط الزكوي/الضريبي للأعوام (…) بمبلغ (…) ريال", en: "Approving the settlement with ZATCA on the zakat/tax assessments for the years (…) for SAR (…)", reqs: [
        doc("الربط والاعتراض", "Assessment and objection", "finance"),
        doc("رأي المستشار", "Adviser's opinion", "finance"),
        doc("الأثر المالي", "Financial impact", "finance"),
        doc("مقارنة مبلغ التسوية بالمخصص المكوّن", "Settlement amount compared with the recorded provision", "finance"),
        rec("توصية لجنة المراجعة", "Audit committee recommendation", "audit"),
        disclose("تقييم الإفصاح للمدرجة إن كان الأثر جوهرياً", "Assess disclosure if the impact is material (listed companies)"),
      ] },
      { body: "board", keys: ["احتياطي", "الاحتياطي", "احتياطيات"], kind: "decision", title: `${ga} بتكوين/استخدام احتياطي (…) بمبلغ (…) ريال ${fy}`, en: `${gaEn} the formation/use of the (…) reserve of SAR (…) ${fyEn}`, reqs: [
        doc("القوائم المالية", "Financial statements", "finance"),
        doc("نص النظام الأساس", "Relevant bylaws provision", "legal"),
        doc("الغرض والمبلغ المقترح", "Purpose and proposed amount", "finance"),
        chk("تكوين الاحتياطي من صافي الربح عند تقرير الأرباح (نظام الشركات م123)", "Reserve formed from net profit when profits are declared (Companies Law Art. 123)"),
        chk("الاحتياطي المخصص لغرض في النظام الأساس لا يُستخدم إلا بقرار جمعية غير عادية، وغير المخصص تستخدمه الجمعية العادية بتوصية المجلس (نظام الشركات م124)", "A reserve earmarked in the bylaws is used only by an Extraordinary GA resolution; an unearmarked one by the Ordinary GA on the board's recommendation (Companies Law Art. 124)"),
      ] },
      { body: "board", keys: ["مشاريع راسماليه", "راسماليه", "توسع", "توسعه"], kind: "decision", title: `التصويت على اعتماد خطة المصروفات الرأسمالية لعام (…) بمبلغ (…) ريال`, en: `Approving the capital expenditure plan for (…) of SAR (…)`, reqs: [
        doc("دراسات الجدوى", "Feasibility studies"),
        doc("مصادر التمويل", "Funding sources", "finance"),
        doc("قائمة المشاريع وتكلفتها وجدولها الزمني وأولوياتها", "List of projects with costs, timeline and priorities"),
        doc("العائد المتوقع وفترة الاسترداد", "Expected return and payback period"),
        chk("مواءمتها مع الموازنة والخطة الاستراتيجية", "Aligned with the budget and the strategic plan"),
      ] },
    ]),
    ...group("المراجعة والأرباح", [
      { body: "board", keys: ["مراجع الحسابات", "المراجع الخارجي", "مراجع"], kind: "decision", title: `${ga} بتعيين مراجع الحسابات من بين المرشحين بناءً على توصية لجنة المراجعة، لفحص ومراجعة وتدقيق القوائم المالية للربعين الثاني والثالث والقوائم السنوية للعام المالي (…) والربع الأول من العام المالي (…)، وتحديد أتعابه`, en: `${gaEn} the appointment of the external auditor from among the nominees, based on the audit committee's recommendation, to review and audit the financial statements for the second and third quarters and the annual financial statements for the financial year (…) and the first quarter of the financial year (…), and determine its fees`, reqs: [
        rec("توصية لجنة المراجعة", "Audit committee recommendation", "audit"),
        chk("تحديد الجمعية أتعاب المراجع ونطاق عمله ومدة تكليفه (نظام الشركات م18؛ اللائحة التنفيذية للمدرجة م3)", "The General Assembly sets the auditor's fees, scope and term (Companies Law Art. 18; IR Art. 3)"),
        doc("عروض المراجعين (مرشحان على الأقل، لائحة الحوكمة م78)", "Auditors' proposals (at least two nominees, CGR Art. 78)", "finance"),
        doc("إقرارات الاستقلال وترخيص المراجعين", "Auditors' independence declarations and licences", "finance"),
        chk("مدة المراجع الحالي (7 سنوات حداً أقصى للمدرجة، اللائحة التنفيذية للمدرجة م3)", "Current auditor's tenure (7 years maximum for listed companies, IR Art. 3)"),
      ] },
      { body: "board", keys: ["توزيع", "الارباح", "ارباح", "نقديه"], kind: "decision", title: `${ga} بتوزيع أرباح نقدية على المساهمين عن العام المالي (…) بواقع (…) ريال للسهم وبإجمالي (…) ريال، على أن تكون الأحقية للمساهمين المسجلين بنهاية يوم (…) ويبدأ التوزيع في (…)`, en: `${gaEn} a cash dividend for the financial year (…) of SAR (…) per share, totalling SAR (…), to shareholders registered at the end of (…), with distribution starting on (…)`, reqs: [
        doc("الأرباح القابلة للتوزيع وفق آخر قوائم مالية مدققة", "Distributable profits per the latest audited financial statements", "finance"),
        doc("سياسة توزيع الأرباح", "Dividend policy", "finance"),
        doc("الأثر على السيولة والتعهدات البنكية", "Impact on liquidity and bank covenants", "finance"),
        chk("تاريخا الأحقية والتوزيع في قرار الجمعية (نظام الشركات م125/2)", "Record and distribution dates set in the General Assembly resolution (Companies Law Art. 125(2))"),
        after("الصرف خلال 15 يوم عمل من تاريخ الأحقية للمدرجة (اللائحة التنفيذية للمدرجة م46)", "Payment within 15 business days of the record date (listed companies; IR Art. 46)", "15bd", "finance"),
        disclose("الإفصاح الفوري عن التوصية للمدرجة (قواعد الطرح م80)", "Immediate disclosure of the recommendation (listed companies; OSCOs Art. 80)"),
      ] },
      { body: "board", keys: ["مرحليه", "توزيع", "ارباح"], kind: "decision", title: `التصويت على توزيع أرباح مرحلية ${period} بواقع (…) ريال للسهم وبإجمالي (…) ريال بناءً على تفويض الجمعية العامة، على أن تكون الأحقية للمساهمين المسجلين بنهاية يوم (…) ويبدأ التوزيع في (…)`, en: `Approving an interim dividend ${periodEn} of SAR (…) per share, totalling SAR (…), under the General Assembly's authorization, to shareholders registered at the end of (…), with distribution starting on (…)`, reqs: [
        doc("قرار الجمعية بالتفويض", "General Assembly authorization resolution", "secretary"),
        doc("القوائم المالية الأولية", "Interim financial statements", "finance"),
        doc("ملاءة السيولة", "Liquidity sufficiency", "finance"),
        chk("انتظام الربحية وكفاية الأرباح القابلة للتوزيع (اللائحة التنفيذية للمدرجة م47)", "Consistent profitability and sufficient distributable profits (IR Art. 47)"),
        chk("تاريخا الأحقية والتوزيع في القرار (لائحة الحوكمة م9)", "Record and distribution dates set in the resolution (CGR Art. 9)"),
        after("الصرف خلال 15 يوم عمل من تاريخ الأحقية (اللائحة التنفيذية للمدرجة م46)", "Payment within 15 business days of the record date (IR Art. 46)", "15bd", "finance"),
        disclose("الإفصاح الفوري عن القرار (اللائحة التنفيذية للمدرجة م49)", "Immediate disclosure of the resolution (IR Art. 49)"),
      ] },
      { body: "board", keys: ["تفويض", "مرحليه"], kind: "decision", title: `${ga} بتفويض مجلس الإدارة بتوزيع أرباح مرحلية على المساهمين بشكل نصف سنوي أو ربع سنوي عن العام المالي (…)`, en: `${gaEn} authorizing the board to distribute interim dividends to shareholders on a semi-annual or quarterly basis for the financial year (…)`, reqs: [
        chk("نص النظام الأساس الذي يجيز التوزيع المرحلي", "Bylaws permit interim distributions"),
        doc("سياسة توزيع الأرباح", "Dividend policy", "finance"),
        doc("مؤشرات الربحية والسيولة المتوقعة", "Expected profitability and liquidity indicators", "finance"),
        chk("تجديد التفويض سنوياً (اللائحة التنفيذية للمدرجة م47)", "Authorization renewed annually (IR Art. 47)"),
      ] },
      { body: "board", keys: ["الاحقيه", "تاريخ الصرف", "صرف الارباح"], kind: "decision", title: "التصويت على اتخاذ إجراءات صرف الأرباح التي أقرتها الجمعية العامة بتاريخ (…) وفق تاريخي الأحقية والتوزيع المحددين في قرارها", en: "Implementing the payment of the dividend approved by the General Assembly on (…) on the record and distribution dates set in its resolution", reqs: [
        doc("قرار الجمعية متضمناً تاريخي الأحقية والتوزيع، فلا يحددهما المجلس لاحقاً (نظام الشركات م125/2)", "General Assembly resolution stating the record and distribution dates, which the board does not set later (Companies Law Art. 125(2))", "secretary"),
        after("الصرف خلال 15 يوم عمل من تاريخ الأحقية للمدرجة (اللائحة التنفيذية للمدرجة م46)", "Payment within 15 business days of the record date (listed companies; IR Art. 46)", "15bd", "finance"),
        after("التنسيق مع مركز إيداع الأوراق المالية", "Coordinate with the Securities Depository Center (Edaa)", undefined, "finance"),
        doc("توافر السيولة في تاريخ الصرف", "Liquidity available on the payment date", "finance"),
        disclose(),
      ] },
    ]),
    ...group("المجلس والإدارة التنفيذية", [
      { body: "board", keys: ["مكافات", "مكافاه", "المكافات"], kind: "decision", title: `${ga} بصرف مبلغ (…) ريال مكافأة لأعضاء مجلس الإدارة عن العام المالي (…)`, en: `${gaEn} paying SAR (…) as remuneration to board members for the financial year (…)`, reqs: [
        rec("توصية لجنة المكافآت", "Remuneration committee recommendation", "nrc"),
        chk("حدود النظام الأساس (نظام الشركات م76)", "Within the limits set by the bylaws (Companies Law Art. 76)"),
        doc("سياسة المكافآت المعتمدة", "Approved remuneration policy"),
        doc("بيان مفصل لمكافأة كل عضو وحضوره", "Detailed statement of each member's remuneration and attendance", "finance"),
        after("الإفصاح في تقرير المجلس (لائحة الحوكمة م90)", "Disclose in the board report (CGR Art. 90)", undefined, "secretary"),
        after("لا يصوّت أعضاء المجلس على هذا البند في الجمعية (اللائحة التنفيذية للمدرجة م7)", "Board members do not vote on this item at the General Assembly (IR Art. 7)", undefined, "secretary"),
      ] },
      { body: "board", keys: ["الاعمال والعقود", "مصلحه", "ذات علاقه", "ذي علاقه"], kind: "decision", title: `${ga} بالترخيص بالأعمال والعقود التي ستتم بين الشركة و(…) والتي لعضو مجلس الإدارة (…) مصلحة مباشرة أو غير مباشرة فيها، وهي (…) بقيمة (…) ريال`, en: `${gaEn} authorizing the business and contracts between the company and (…) in which board member (…) has a direct or indirect interest, namely (…) of SAR (…)`, reqs: [
        doc("إفصاح العضو", "Member's disclosure", "secretary"),
        doc("تقرير خاص من مراجع الحسابات", "External auditor's special report", "finance"),
        rec("مراجعة لجنة المراجعة (بند مستقل لكل عقد)", "Audit committee review (a separate item for each contract)", "audit"),
        doc("شروط التعامل ومقارنتها بالسوق", "Transaction terms compared with the market"),
        noInterest("امتناع العضو صاحب المصلحة عن التصويت (نظام الشركات م27/م71/م96)", "Interested member abstains from voting (Companies Law Arts. 27/71/96)"),
        chk("ترخيص الجمعية إذا لم تفوّض المجلس أو لم تتحقق شروط التفويض (اللائحة التنفيذية للمدرجة م65)", "General Assembly authorization where it has not delegated the board or the delegation conditions are not met (IR Art. 65)"),
      ] },
      { body: "board", keys: ["ذات علاقه", "ذي علاقه", "ترخيص", "تعامل"], kind: "decision", title: "التصويت على الترخيص بالأعمال والعقود التي ستتم بين الشركة و(…) والتي لعضو مجلس الإدارة (…) مصلحة فيها، بقيمة (…) ريال، بناءً على تفويض الجمعية العامة الصادر بتاريخ (…)", en: "Authorizing the business and contracts between the company and (…) in which board member (…) has an interest, of SAR (…), under the General Assembly's delegation dated (…)", reqs: [
        doc("قيمة التعامل ونسبته من الإيرادات", "Transaction value and its share of revenue", "finance"),
        doc("قرار الجمعية بالتفويض وسريانه سنة من تاريخه أو حتى نهاية دورة المجلس أيهما أسبق (اللائحة التنفيذية للمدرجة م64)", "General Assembly delegation, valid for one year or until the end of the board term, whichever is earlier (IR Art. 64)", "secretary"),
        chk("شروطه: أقل من 1% من الإيرادات و10 ملايين ريال، ضمن النشاط المعتاد، دون شروط تفضيلية (اللائحة التنفيذية للمدرجة م64)", "Conditions: below 1% of revenue and SAR 10 million, in the ordinary course of business, with no preferential terms (IR Art. 64)"),
        noInterest("إفصاح العضو وامتناعه عن التصويت", "Member's disclosure and abstention from voting"),
      ] },
      { body: "board", keys: ["منافس", "منافسه"], kind: "decision", title: `${ga} بالترخيص لعضو مجلس الإدارة (…) بالاشتراك في عمل منافس لأعمال الشركة من خلال (…)`, en: `${gaEn} authorizing board member (…) to participate in a business competing with the company through (…)`, reqs: [
        doc("إفصاح العضو وطبيعة العمل المنافس ونطاقه", "Member's disclosure of the competing business, its nature and scope", "secretary"),
        doc("تقييم المنافسة (لائحة الحوكمة م44)", "Assessment of the competition (CGR Art. 44)"),
        doc("رأي قانوني", "Legal opinion", "legal"),
        chk("ترخيص الجمعية شرط لازم (نظام الشركات م27)", "General Assembly authorization is required (Companies Law Art. 27)"),
        noInterest("امتناع العضو عن التصويت", "Member abstains from voting"),
      ] },
      { body: "board", keys: ["انتخاب", "الدوره القادمه", "دوره المجلس"], kind: "decision", title: `${ga} بانتخاب أعضاء مجلس الإدارة من بين المرشحين للدورة القادمة التي تبدأ في (…) وتنتهي في (…)`, en: `${gaEn} the election of board members from among the nominees for the next term starting on (…) and ending on (…)`, reqs: [
        rec("توصية لجنة الترشيحات", "Nomination committee recommendation", "nrc"),
        chk("مدة الدورة وفق النظام الأساس بحد أقصى 4 سنوات (نظام الشركات م68)", "Term per the bylaws, 4 years maximum (Companies Law Art. 68)"),
        chk("التصويت التراكمي للمدرجة (اللائحة التنفيذية للمدرجة م5)", "Cumulative voting for listed companies (IR Art. 5)"),
        doc("إعلان الترشح (شهر على الأقل، لائحة الحوكمة م65)", "Call for nominations (at least one month, CGR Art. 65)", "secretary"),
        doc("السير الذاتية وإقرارات الاستقلال والإفصاح عن تعارض المصالح (لائحة الحوكمة م43)", "CVs, independence declarations and conflict-of-interest disclosures (CGR Art. 43)", "secretary"),
        after("نشر معلومات المرشحين مع الدعوة (لائحة الحوكمة م8)", "Publish the nominees' information with the invitation (CGR Art. 8)", "before_ga", "secretary"),
      ] },
      { body: "board", keys: ["استقاله", "استقال", "المستقيل"], kind: "decision", title: "التصويت على قبول استقالة عضو مجلس الإدارة (…) اعتباراً من (…)", en: "Accepting the resignation of board member (…) effective (…)", reqs: [
        doc("خطاب الاستقالة وتاريخ نفاذها (نظام الشركات م69)", "Resignation letter and effective date (Companies Law Art. 69)", "secretary"),
        doc("أسباب الاستقالة وملاحظات العضو إن وجدت", "Reasons for the resignation and the member's remarks, if any", "secretary"),
        chk("أثرها على النصاب وتشكيل اللجان", "Impact on quorum and committee composition"),
        after("إبلاغ الهيئة والسوق فوراً مع الأسباب (اللائحة التنفيذية للمدرجة م6؛ قواعد الطرح م80)", "Notify the CMA and the market immediately with the reasons (IR Art. 6; OSCOs Art. 80)", "immediate", "ir"),
      ] },
      { body: "board", keys: ["شاغر", "المقعد", "بدل", "بدلا", "بديل", "المستقيل", "استقال"], kind: "decision", title: "التصويت على تعيين (…) عضواً في مجلس الإدارة اعتباراً من (…) بدلاً من العضو المستقيل (…) لإكمال مدة الدورة، وعرض التعيين على أول جمعية عامة عادية", en: "Appointing (…) as a board member effective (…) replacing resigned member (…) for the remainder of the term, subject to the next Ordinary General Assembly", reqs: [
        rec("توصية لجنة الترشيحات", "Nomination committee recommendation", "nrc"),
        doc("السيرة الذاتية وإقرار الاستقلال وتصنيف العضوية (تنفيذي، غير تنفيذي، مستقل)", "CV, independence declaration and membership classification (executive, non-executive, independent)", "secretary"),
        after("إبلاغ السجل التجاري والهيئة خلال 15 يوماً من التعيين (نظام الشركات م69)", "Notify the commercial register and the CMA within 15 days of the appointment (Companies Law Art. 69)", "15d", "secretary"),
        chk("ألا يقل عدد الأعضاء بالشغور عن الحد اللازم لصحة الاجتماعات", "The vacancy does not reduce membership below the quorum needed for valid meetings"),
        disclose("الإفصاح الفوري للمدرجة (قواعد الطرح م80)", "Immediate disclosure (listed companies; OSCOs Art. 80)"),
      ] },
      { body: "board", keys: ["رئيس المجلس", "نائب الرئيس", "نائبه"], kind: "decision", title: "التصويت على تعيين (…) رئيساً لمجلس الإدارة و(…) نائباً للرئيس اعتباراً من (…) حتى نهاية الدورة الحالية", en: "Appointing (…) as chairman and (…) as vice-chairman of the board effective (…) until the end of the current term", reqs: [
        doc("قرار الجمعية بانتخاب المجلس", "General Assembly resolution electing the board", "secretary"),
        chk("التعيين في أول اجتماع للمجلس، ونائب الرئيس إلزامي للمدرجة (نظام الشركات م78)", "Appointment at the board's first meeting; a vice-chairman is mandatory for listed companies (Companies Law Art. 78)"),
        chk("عدم الجمع بين رئاسة المجلس وأي منصب تنفيذي (لائحة الحوكمة م23)", "The chairman holds no executive position (CGR Art. 23)"),
        doc("تحديد الصلاحيات كتابةً إن خلا منها النظام الأساس (نظام الشركات م78)", "Written powers if the bylaws are silent (Companies Law Art. 78)", "legal"),
        after("إبلاغ الجهات وتحديث السجل التجاري", "Notify the authorities and update the commercial register", undefined, "secretary"),
      ] },
      { body: "board", keys: ["امين السر", "امين سر"], kind: "decision", title: "التصويت على تعيين (…) أميناً لسر مجلس الإدارة وتحديد مهامه ومكافأته", en: "Appointing (…) as board secretary and determining the duties and remuneration", reqs: [
        doc("السيرة الذاتية (لائحة الحوكمة م36)", "CV (CGR Art. 36)"),
        doc("تحديد مهامه وفق لائحة الحوكمة م35", "Duties defined per CGR Art. 35"),
        doc("مكافأته إن لم يحددها النظام الأساس (نظام الشركات م78)", "Remuneration, if not set by the bylaws (Companies Law Art. 78)"),
      ] },
      { body: "board", keys: ["الرئيس التنفيذي", "التنفيذي"], kind: "decision", title: "التصويت على تعيين (…) رئيساً تنفيذياً للشركة اعتباراً من (…) وتحديد صلاحياته ومكافأته", en: "Appointing (…) as CEO effective (…) and determining the powers and remuneration", reqs: [
        rec("توصية لجنة الترشيحات والمكافآت", "Nomination and remuneration committee recommendation", "nrc"),
        doc("السيرة الذاتية والتحقق من المؤهلات", "CV and verification of qualifications", "hr"),
        chk("عدم الجمع بين منصب الرئيس التنفيذي ورئاسة المجلس (لائحة الحوكمة م23)", "The CEO is not also the chairman (CGR Art. 23)"),
        doc("مسودة العقد والمكافأة والصلاحيات (نظام الشركات م78)", "Draft contract, remuneration and powers (Companies Law Art. 78)", "hr"),
        disclose("الإفصاح الفوري للمدرجة (قواعد الطرح م80)", "Immediate disclosure (listed companies; OSCOs Art. 80)"),
        after("تحديث السجل التجاري والمفوضين بالتوقيع", "Update the commercial register and authorized signatories", undefined, "secretary"),
      ] },
      { body: "board", keys: ["استقاله الرئيس التنفيذي", "انهاء خدمات", "انهاء عقد"], kind: "decision", title: "التصويت على استقالة/إعفاء الرئيس التنفيذي (…) اعتباراً من (…) وتكليف (…) بمهامه مؤقتاً", en: "Resignation/dismissal of CEO (…) effective (…) and assigning (…) as acting CEO", reqs: [
        rec("توصية لجنة الترشيحات والمكافآت", "Nomination and remuneration committee recommendation", "nrc"),
        chk("صلاحية المجلس في الإعفاء (نظام الشركات م78)", "Board's power to dismiss (Companies Law Art. 78)"),
        disclose("الإفصاح الفوري للمدرجة (قواعد الطرح م80)", "Immediate disclosure (listed companies; OSCOs Art. 80)"),
        doc("خطاب الاستقالة أو مبررات الإنهاء", "Resignation letter or grounds for termination"),
        doc("الرأي القانوني وفق العقد", "Legal opinion under the contract", "legal"),
        doc("الأثر المالي وفق العقد", "Financial impact under the contract", "finance"),
        doc("خطة الإحلال", "Succession plan", "hr"),
        after("تحديث المفوضين بالتوقيع", "Update the authorized signatories", undefined, "secretary"),
      ] },
      { body: "board", keys: ["المدير المالي", "كبار التنفيذيين", "تعيين مدير"], kind: "decision", title: "التصويت على تعيين (…) في منصب (…) من كبار التنفيذيين اعتباراً من (…)", en: "Appointing (…) as (…) among the senior executives effective (…)", reqs: [
        rec("توصية لجنة الترشيحات والمكافآت", "Nomination and remuneration committee recommendation", "nrc"),
        doc("السيرة الذاتية", "CV", "hr"),
        doc("الوصف الوظيفي والعرض الوظيفي والمكافأة", "Job description, offer and remuneration", "hr"),
        chk("التحقق من المؤهلات", "Qualifications verified"),
        doc("عدم ممانعة الجهة الرقابية في القطاعات المنظمة", "Regulator's no-objection in regulated sectors", "legal"),
      ] },
      { body: "board", keys: ["متغيب", "انهاء عضويه", "غياب"], kind: "decision", title: `${ga} بإنهاء عضوية العضو (…) لتغيبه عن الاجتماعات`, en: `${gaEn} terminating the membership of (…) for absence from meetings`, reqs: [
        doc("سجل الحضور (نظام الشركات م70: 3 اجتماعات متتالية أو 5 متفرقة دون عذر يقبله المجلس)", "Attendance record (Companies Law Art. 70: 3 consecutive or 5 separate meetings without an excuse accepted by the board)", "secretary"),
        after("رفع توصية المجلس للجمعية", "Submit the board's recommendation to the General Assembly", "before_ga", "secretary"),
        doc("ما يثبت إبلاغ العضو", "Proof the member was notified", "secretary"),
        doc("نص النظام الأساس", "Relevant bylaws provision", "legal"),
        after("إبلاغ الهيئة والسوق فوراً بانتهاء العضوية وأسبابها (اللائحة التنفيذية للمدرجة م6)", "Notify the CMA and the market immediately of the termination and its reasons (IR Art. 6)", "immediate", "ir"),
      ] },
      { body: "board", keys: ["تقييم", "تقييم اداء"], kind: "decision", title: `التصويت على اعتماد نتائج تقييم أداء المجلس ولجانه للعام (…)`, en: `Approving the results of the board and committees' performance assessment for (…)`, reqs: [
        doc("تقرير لجنة الترشيحات", "Nomination committee report", "nrc"),
        doc("نتائج تقييم المجلس واللجان والأعضاء ونقاط القوة والضعف (لائحة الحوكمة م39)", "Assessment results for the board, committees and members, with strengths and weaknesses (CGR Art. 39)", "nrc"),
        doc("خطة المعالجة", "Remediation plan", "nrc"),
        chk("التقييم الخارجي كل 3 سنوات", "External assessment every 3 years"),
      ] },
      { body: "board", keys: ["الهيكل التنظيمي", "هيكل"], kind: "decision", title: "التصويت على اعتماد الهيكل التنظيمي للشركة", en: "Approving the company's organizational structure", reqs: [
        doc("الهيكل الحالي والمقترح", "Current and proposed structure"),
        doc("الأثر على التكاليف", "Cost impact", "finance"),
        doc("مبررات التعديل", "Rationale for the change"),
        rec("توصية لجنة الترشيحات والمكافآت", "Nomination and remuneration committee recommendation", "nrc"),
        chk("مواءمته مع جدول الصلاحيات واستقلال وظائف المراجعة الداخلية والالتزام والمخاطر", "Aligned with the delegation of authority and the independence of internal audit, compliance and risk"),
      ] },
      { body: "board", keys: ["الموارد البشريه", "لائحه شؤون الموظفين", "سلم الرواتب"], kind: "decision", title: "التصويت على اعتماد/تحديث لائحة الموارد البشرية وسلم الرواتب", en: "Approving/updating the HR policy and salary scale", reqs: [
        rec("توصية لجنة المكافآت", "Remuneration committee recommendation", "nrc"),
        doc("مقارنة التعديلات", "Comparison of changes", "hr"),
        doc("الأثر المالي", "Financial impact", "finance"),
        doc("مقارنة سلم الرواتب بالسوق", "Salary scale benchmarked against the market", "hr"),
        doc("المراجعة القانونية والتوافق مع نظام العمل", "Legal review of compliance with the Labor Law", "legal"),
      ] },
      { body: "board", keys: ["حوافز", "مكافات الاداره", "مكافات التنفيذيين"], kind: "decision", title: `التصويت على اعتماد مكافآت الأداء السنوية للإدارة التنفيذية عن العام (…) بإجمالي (…) ريال`, en: `Approving the annual performance bonuses of the executive management for (…) totalling SAR (…)`, reqs: [
        rec("توصية لجنة المكافآت", "Remuneration committee recommendation", "nrc"),
        doc("نتائج مؤشرات الأداء", "KPI results", "hr"),
        doc("سياسة المكافآت المعتمدة (لائحة الحوكمة م59)", "Approved remuneration policy (CGR Art. 59)", "hr"),
        doc("القوائم المالية المعتمدة التي بُني عليها الاستحقاق", "Approved financial statements the entitlement is based on", "finance"),
        after("الإفصاح في تقرير المجلس (لائحة الحوكمة م90)", "Disclose in the board report (CGR Art. 90)", undefined, "secretary"),
      ] },
      { body: "board", keys: ["اسهم الموظفين", "برنامج حوافز", "خطه حوافز"], kind: "decision", title: `${ega} باعتماد برنامج أسهم الموظفين بحد أقصى (…) سهم، وتفويض مجلس الإدارة بتحديد شروطه`, en: `${egaEn} approving the employee share program of up to (…) shares and authorizing the board to set its terms`, reqs: [
        doc("وثيقة البرنامج", "Program document", "hr"),
        rec("توصية لجنة المكافآت", "Remuneration committee recommendation", "nrc"),
        chk("نص النظام الأساس الذي يجيزه", "Bylaws permit the program"),
        chk("مصدر الأسهم: شراء الشركة لأسهمها بشروطه (اللائحة التنفيذية للمدرجة م17) أو تخصيص أسهم عند زيادة رأس المال (نظام الشركات م127)", "Source of shares: a buyback on its conditions (IR Art. 17) or an allocation on a capital increase (Companies Law Art. 127)"),
        chk("عند تمويله بشراء أسهم: لا يشارك غير التنفيذيين ولا يصوّت التنفيذيون (اللائحة التنفيذية للمدرجة م29)", "If funded by a buyback: non-executives do not participate and executives do not vote (IR Art. 29)"),
      ] },
      { body: "board", keys: ["تعريف", "تدريب", "الاعضاء الجدد"], kind: "decision", title: "التصويت على اعتماد برنامج تعريف الأعضاء الجدد وخطة تدريب أعضاء المجلس", en: "Approving the induction program for new members and the board training plan", reqs: [
        rec("توصية لجنة الترشيحات", "Nomination committee recommendation", "nrc"),
        doc("برنامج التعريف (الاستراتيجية، الجوانب المالية والتشغيلية، واجبات الأعضاء، مهام اللجان)", "Induction program (strategy, financial and operational matters, members' duties, committee roles)"),
        doc("خطة التدريب وتكلفتها (لائحة الحوكمة م37)", "Training plan and its cost (CGR Art. 37)"),
      ] },
    ]),
    ...[...partTwo(), ...partThree()].flatMap(([category, items]) => group(category, items)),
  ];
}
