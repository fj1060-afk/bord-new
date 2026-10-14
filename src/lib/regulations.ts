// Short, page-level reminders of the articles that govern what the user is doing.
// Summaries, not the official text: the source and article are always shown.

export type Note = { source: string; article: string; text: string };

const LAW = "نظام الشركات";
const CMA = "لائحة حوكمة الشركات";

export const NOTES = {
  meetings: [
    { source: LAW, article: "م80/1", text: "يجتمع مجلس إدارة شركة المساهمة أربع مرات في السنة على الأقل." },
    { source: CMA, article: "م30/ب", text: "اجتماع واحد كل ثلاثة أشهر على الأقل (للشركات المدرجة)." },
    { source: CMA, article: "م30/ج", text: "تُرسل الدعوة مع جدول الأعمال والمستندات قبل خمسة أيام على الأقل، إلا في الاجتماع الطارئ." },
  ],
  quorum: [
    { source: LAW, article: "م80/2", text: "لا يصح الاجتماع إلا بحضور نصف الأعضاء أصالة أو نيابة، ما لم يشترط نظام الشركة الأساس أكثر." },
    { source: CMA, article: "م30/د", text: "ولا يقل الحاضرون عن ثلاثة (للشركات المدرجة)." },
    { source: LAW, article: "م81", text: "الإنابة لعضو في المجلس فقط إن أجازها نظام الشركة الأساس، ولا يحمل العضو أكثر من إنابة واحدة." },
  ],
  board: [
    { source: LAW, article: "م67، م68", text: "لا يقل أعضاء المجلس عن ثلاثة، ولا تتجاوز الدورة أربع سنوات." },
    { source: CMA, article: "م16", text: "أغلبية المجلس من غير التنفيذيين، والمستقلون عضوان أو الثلث أيهما أكثر." },
    { source: LAW, article: "م70", text: "يجوز إنهاء عضوية من تغيّب بلا عذر ثلاثة اجتماعات متتالية أو خمسة متفرقة." },
  ],
  committees: [
    { source: CMA, article: "م50/4", text: "لا يقل أعضاء اللجنة عن ثلاثة ولا يزيدون على خمسة." },
    { source: CMA, article: "م51", text: "لجنة المراجعة بلا أعضاء تنفيذيين، وفيها مستقل على الأقل، ورئيسها مستقل، ومن أعضائها مختص بالشؤون المالية." },
    { source: CMA, article: "م54، م60", text: "تجتمع لجنة المراجعة أربع مرات في السنة، ولجنة المكافآت مرة على الأقل." },
  ],
} satisfies Record<string, Note[]>;
