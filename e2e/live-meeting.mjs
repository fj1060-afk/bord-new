// End-to-end walk through phase 4 (holding a meeting) as the board secretary.
// Usage: BASE_URL=... E2E_EMAIL=... E2E_PASSWORD=... node e2e/live-meeting.mjs [screenshot-dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const stamp = Date.now().toString().slice(-5);
const results = [];
const problems = [];

const proxy = process.env.HTTPS_PROXY && !base.includes("localhost") ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, proxy });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("dialog", (d) => d.accept());
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 500 && problems.push(`${r.status()} ${r.url()}`));

async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split("\n")[0]}`);
  } finally {
    await page.screenshot({ path: `${out}/live-${String(results.length).padStart(2, "0")}.png`, fullPage: true }).catch(() => {});
  }
}
let meetingUrl = "";
const live = () => page.goto(meetingUrl + "?tab=live", { waitUntil: "networkidle" });

await step("تسجيل الدخول", async () => {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", process.env.E2E_EMAIL);
  await page.fill("input[name=password]", process.env.E2E_PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL(base + "/", { timeout: 20000 });
});

await step("إنشاء اجتماع ببندين واعتماد موعده", async () => {
  await page.goto(base + "/meetings/new", { waitUntil: "networkidle" });
  const board = await page.locator("select[name=body] option[value^='board:']").first().getAttribute("value");
  await page.selectOption("select[name=body]", board);
  await page.fill("input[name=title]", `اجتماع انعقاد ${stamp}`);
  await page.fill("input[name=date]", new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10));
  await page.fill("input[name=location]", "قاعة المجلس");
  await page.click("button:has-text('إنشاء الاجتماع')");
  await page.waitForURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 20000 });
  meetingUrl = page.url().split("?")[0];
  for (const title of ["القوائم المالية", "خطة العام القادم"]) {
    await page.goto(meetingUrl + "?tab=agenda", { waitUntil: "networkidle" });
    await page.click("summary:has-text('إضافة بند')");
    const form = page.locator("form:has(button:has-text('إضافة البند'))");
    await form.locator("input[name=title]").fill(title);
    await form.locator("button:has-text('إضافة البند')").click();
    await page.getByRole("status").filter({ hasText: "أُضيف البند" }).waitFor({ timeout: 20000 });
  }
  await page.goto(meetingUrl, { waitUntil: "networkidle" });
  await page.click("button:has-text('اعتماد الموعد')");
  await page.getByText("مُجدول").first().waitFor({ timeout: 20000 });
});

await step("البدء معطّل قبل اكتمال النصاب", async () => {
  await live();
  await page.getByText("النصاب غير مكتمل").waitFor();
  if (!(await page.locator("button:has-text('بدء الاجتماع')").isDisabled())) throw new Error("start button enabled");
});

await step("تسجيل الحضور وإنابة عضو", async () => {
  await live();
  const selects = page.locator("select[aria-label='حالة الحضور']");
  const count = await selects.count();
  if (count < 2) throw new Error(`only ${count} invitees`);
  for (let i = 0; i < count; i++) {
    await live();
    await page.locator("select[aria-label='حالة الحضور']").nth(i).selectOption(i === count - 1 ? "proxy" : "present");
    await page.waitForLoadState("networkidle");
  }
  await live();
  await page.locator("select[aria-label='ينوب عنه']").selectOption({ index: 1 });
  await page.waitForLoadState("networkidle");
  await live();
  await page.getByText("النصاب مكتمل").waitFor({ timeout: 20000 });
});

await step("بدء الاجتماع", async () => {
  await page.click("button:has-text('بدء الاجتماع')");
  await page.getByText("يُناقش الآن").waitFor({ timeout: 20000 });
  await page.getByText("القوائم المالية").first().waitFor();
});

await step("المؤقت يعمل", async () => {
  await live();
  const first = await page.locator("span[dir=ltr].font-mono").first().innerText();
  await page.waitForTimeout(2200);
  const second = await page.locator("span[dir=ltr].font-mono").first().innerText();
  if (first === second) throw new Error(`timer stuck at ${first}`);
});

await step("إغلاق البند الأول والانتقال للتالي", async () => {
  await page.fill("textarea[name=outcome]", "اعتمد المجلس القوائم المالية.");
  await page.click("button:has-text('تمت مناقشته')");
  // The form is rebuilt for the next item, so check the result rather than the toast.
  await page.locator("li.bg-brass-soft:has-text('خطة العام القادم')").waitFor({ timeout: 20000 });
  await live();
  await page.getByText("اعتمد المجلس القوائم المالية.").waitFor();
});

await step("استراحة واستئناف", async () => {
  await live();
  await page.click("button:has-text('بدء استراحة')");
  await page.getByText("استئناف الاجتماع").waitFor({ timeout: 20000 });
  await page.click("button:has-text('استئناف الاجتماع')");
  await page.getByText("بدء استراحة").waitFor({ timeout: 20000 });
});

await step("تأجيل البند الثاني وإنهاء الاجتماع", async () => {
  await live();
  await page.click("button:has-text('تأجيل البند')");
  await page.getByText("لا يوجد بند مفتوح").waitFor({ timeout: 20000 });
  await live();
  await page.click("button:has-text('إنهاء الاجتماع')");
  await page.getByText("انتهى").first().waitFor({ timeout: 20000 });
});

await step("كشف الحضور للطباعة", async () => {
  const id = meetingUrl.split("/").pop();
  const res = await page.goto(`${base}/print/meetings/${id}/attendance`, { waitUntil: "networkidle" });
  if (!res || res.status() !== 200) throw new Error(`status ${res?.status()}`);
  await page.getByText("كشف حضور اجتماع").waitFor();
  await page.getByText(/يحمل إنابة/).first().waitFor();
  await page.locator(".doc-quorum .met").waitFor();
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
