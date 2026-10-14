// Phase 6: dashboard per role, and the document library (upload, open, archive).
// Usage: BASE_URL=... ADMIN=email:pass SECRETARY=... ASSIGNEE=... MEMBER=... node e2e/dashboard-library.mjs [dir]
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? ".";
const stamp = Date.now().toString().slice(-5);
const results = [];
const problems = [];
const proxy = process.env.HTTPS_PROXY && !base.includes("localhost") ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, proxy });
let page;

async function as(name) {
  await page?.context().close();
  page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => problems.push(`${name} pageerror: ${e.message}`));
  page.on("response", (r) => r.status() >= 500 && problems.push(`${name} ${r.status()} ${r.url()}`));
  const [email, password] = process.env[name].split(/:(.*)/s);
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  await page.fill("input[name=email]", email);
  await page.fill("input[name=password]", password);
  await page.click("button[type=submit]");
  await page.waitForURL(base + "/", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}
async function step(name, fn) {
  try {
    await fn();
    results.push(`✅ ${name}`);
  } catch (e) {
    results.push(`❌ ${name}: ${e.message.split("\n")[0]}`);
  } finally {
    await page?.screenshot({ path: `${out}/dash-${String(results.length).padStart(2, "0")}.png`, fullPage: true }).catch(() => {});
  }
}
const has = async (text) => page.getByText(text).first().waitFor({ timeout: 15000 });
const lacks = async (text) => {
  if (await page.getByText(text).count()) throw new Error(`should not show "${text}"`);
};

await step("المدير: لوحة كاملة", async () => {
  await as("ADMIN");
  for (const t of ["اجتماعات قادمة", "مهامي المفتوحة", "تنفيذ القرارات", "تحتاج متابعتك", "حضور الأعضاء", "خطة بناء المنصة"]) await has(t);
});

await step("السكرتير: متابعات وحضور بلا خطة البناء", async () => {
  await as("SECRETARY");
  for (const t of ["تحتاج متابعتك", "حضور الأعضاء", "تنفيذ القرارات"]) await has(t);
  await lacks("خطة بناء المنصة");
});

await step("المدير المالي: مهامه فقط", async () => {
  await as("ASSIGNEE");
  await has("مهامي المفتوحة");
  for (const t of ["تحتاج متابعتك", "حضور الأعضاء", "تنفيذ القرارات"]) await lacks(t);
});

await step("عضو المجلس: الاجتماعات والتوقيعات", async () => {
  await as("MEMBER");
  for (const t of ["اجتماعات قادمة", "محاضر بانتظار توقيعك"]) await has(t);
  await lacks("تحتاج متابعتك");
});

await step("رفع مستند للمكتبة وفتحه", async () => {
  await as("ADMIN");
  await page.goto(base + "/documents", { waitUntil: "networkidle" });
  await page.click("summary:has-text('إضافة مستند للمكتبة')");
  await page.fill("input[name=title]", `سياسة تعارض المصالح ${stamp}`);
  await page.locator("input[name=file]").setInputFiles({ name: "policy.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await page.click("button:has-text('رفع المستند')");
  await has("أُضيف المستند إلى المكتبة");
  await page.goto(base + "/documents", { waitUntil: "networkidle" });
  const href = await page.locator(`a:has-text('سياسة تعارض المصالح ${stamp}')`).getAttribute("href");
  const res = await page.request.get(base + href, { maxRedirects: 0 });
  if (res.status() !== 307 || !(res.headers().location ?? "").includes("/storage/")) throw new Error(`open → ${res.status()}`);
});

await step("البحث والتصنيف والأرشفة", async () => {
  await page.goto(`${base}/documents?tab=library&q=${encodeURIComponent(stamp)}`, { waitUntil: "networkidle" });
  if ((await page.locator("li a[href^='/documents/library/']").count()) !== 1) throw new Error("search should return one document");
  await page.locator("li", { hasText: stamp }).locator("button:has-text('أرشفة')").click();
  await page.waitForLoadState("networkidle");
  await page.goto(`${base}/documents?tab=library&archived=1&q=${encodeURIComponent(stamp)}`, { waitUntil: "networkidle" });
  await has(`سياسة تعارض المصالح ${stamp}`);
});

await step("مستندات الاجتماعات المتاحة", async () => {
  await page.goto(`${base}/documents?tab=meetings`, { waitUntil: "networkidle" });
  if (!(await page.locator("a[href*='/documents/']").count())) throw new Error("no meeting documents listed");
});

await step("ممثل الإدارة لا يرى المكتبة", async () => {
  await as("ASSIGNEE");
  const res = await page.goto(base + "/documents", { waitUntil: "networkidle" });
  if (res?.status() !== 200) throw new Error(`status ${res?.status()}`);
  await lacks("إضافة مستند للمكتبة");
});

await browser.close();
console.log(results.join("\n"));
console.log(problems.length ? `\nProblems:\n${[...new Set(problems)].join("\n")}` : "\nNo page errors.");
process.exit(results.some((r) => r.startsWith("❌")) ? 1 : 0);
