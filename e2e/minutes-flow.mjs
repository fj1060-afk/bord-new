// End-to-end walk through phase 5 on an ended meeting: minutes, resolution, task, signatures.
// Usage: BASE_URL=... MEETING_ID=<ended meeting> SECRETARY=email:pass ASSIGNEE=email:pass SIGNER=email:pass node e2e/minutes-flow.mjs [dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const meetingUrl = `${base}/meetings/${process.env.MEETING_ID}`;
const account = (name) => process.env[name].split(/:(.*)/s).slice(0, 2);
const task = `نشر القوائم المالية ${Date.now().toString().slice(-5)}`;
const results = [];
const problems = [];

const proxy = process.env.HTTPS_PROXY && !base.includes("localhost") ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, proxy });
let page;

async function as(name) {
  await page?.context().close();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 500 && problems.push(`${r.status()} ${r.url()}`));
  const [email, password] = account(name);
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL(base + "/", { timeout: 20000 });
}

async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split("\n")[0]}`);
  } finally {
    await page?.screenshot({ path: `${out}/minutes-${String(results.length).padStart(2, "0")}.png`, fullPage: true }).catch(() => {});
  }
}
const minutesTab = () => page.goto(meetingUrl + "?tab=minutes", { waitUntil: "networkidle" });
const status = (text) => page.getByRole("status").filter({ hasText: text }).first().waitFor({ timeout: 20000 });
let resolutionUrl = "";

await step("السكرتير: إعداد المحضر", async () => {
  await as("SECRETARY");
  await minutesTab();
  await page.click("button:has-text('إعداد المحضر')");
  await page.locator("textarea[name=intro]").waitFor({ timeout: 20000 });
  if (!(await page.locator("textarea[name=intro]").inputValue()).includes("اكتمل النصاب")) throw new Error("intro not pre-filled");
});

await step("تعديل المحضر وحفظه", async () => {
  const item = page.locator("textarea[name^='item:']").first();
  await item.fill("ناقش المجلس القوائم المالية للربع الثالث واطلع على تقرير المراجع.");
  await page.click("button:has-text('حفظ المحضر')");
  await status("حُفظ المحضر");
});

await step("تسجيل قرار بالتصويت", async () => {
  await minutesTab();
  await page.locator("summary:has-text('تسجيل قرار على هذا البند')").first().click();
  const form = page.locator("form:has(button:has-text('تسجيل القرار'))").first();
  await form.locator("textarea[name=text]").fill("اعتماد القوائم المالية للربع الثالث وتكليف الإدارة المالية بنشرها.");
  await form.locator("input[name=votes_for]").fill("4");
  await form.locator("input[name=votes_against]").fill("0");
  await form.locator("button:has-text('تسجيل القرار')").click();
  await status("سُجّل القرار");
  await minutesTab();
  resolutionUrl = base + (await page.locator("a[href^='/resolutions/']").first().getAttribute("href"));
});

await step("إضافة مهمة للإدارة المالية", async () => {
  await page.goto(resolutionUrl, { waitUntil: "networkidle" });
  await page.click("summary:has-text('إضافة مهمة')");
  await page.fill("input[name=title]", task);
  const finance = await page.locator("select[name=assignee] option", { hasText: "الادارة المالية" }).first().getAttribute("value");
  await page.selectOption("select[name=assignee]", finance);
  await page.fill("input[name=due_date]", "2026-10-01");
  await page.click("button:has-text('إضافة المهمة')");
  await status("أُضيفت المهمة");
});

await step("إرسال المحضر للتوقيع وتسجيل التوقيعات الورقية", async () => {
  await minutesTab();
  await page.click("button:has-text('إرسال للتوقيع')");
  await page.getByText("بانتظار التوقيع").first().waitFor({ timeout: 20000 });
  // Paper signatures for members without an account; the member with an account signs online.
  const paper = () => page.locator("li", { hasText: "عضو اختبار" }).locator("button:has-text('تسجيل توقيع ورقي')");
  while (await paper().count()) {
    await paper().first().click();
    await page.waitForLoadState("networkidle");
    await minutesTab();
  }
  if ((await page.getByText("وقّع ورقياً").count()) < 1) throw new Error("no manual signature recorded");
});

await step("المدير المالي: المهمة متأخرة في مهامي", async () => {
  await as("ASSIGNEE");
  await page.goto(base + "/my-tasks", { waitUntil: "networkidle" });
  await page.getByText(task).waitFor();
  await page.locator("li", { hasText: task }).getByText("متأخرة").waitFor();
});

await step("إنجاز المهمة مع رفع الدليل", async () => {
  const card = page.locator("li", { hasText: task }).first();
  await card.locator("input[value=done]").check();
  await card.locator("textarea[name=note]").fill("نُشرت القوائم على تداول.");
  await card.locator("input[type=file]").setInputFiles({ name: "إثبات النشر.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await card.locator("button:has-text('حفظ التحديث')").click();
  await page.getByText("سُجّلت المهمة منجزة").waitFor({ timeout: 20000 });
});

await step("عضو المجلس: التوقيع على المحضر يعتمده", async () => {
  await as("SIGNER");
  await page.goto(base + "/minutes", { waitUntil: "networkidle" });
  await page.getByText("بانتظار توقيعك").first().click();
  await page.waitForURL(/tab=minutes/);
  await page.click("button:has-text('توقيع المحضر')");
  await page.getByText("معتمد").first().waitFor({ timeout: 20000 });
});

await step("السكرتير: الدليل يفتح والمحضر المطبوع معتمد", async () => {
  await as("SECRETARY");
  await page.goto(resolutionUrl, { waitUntil: "networkidle" });
  await page.locator("li", { hasText: task }).getByText("منجزة").first().waitFor();
  const href = await page.locator("a[href^='/my-tasks/evidence/']").first().getAttribute("href");
  const res = await page.request.get(base + href, { maxRedirects: 0 });
  if (res.status() !== 307 || !(res.headers().location ?? "").includes("/storage/")) throw new Error(`evidence → ${res.status()}`);
  await page.goto(`${base}/print/meetings/${process.env.MEETING_ID}/minutes`, { waitUntil: "networkidle" });
  if (await page.getByText("مسودة غير معتمدة").count()) throw new Error("print still shows draft banner");
  await page.getByText("القرار رقم").first().waitFor();
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
