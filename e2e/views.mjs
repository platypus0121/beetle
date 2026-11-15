// 瀏覽統計與店家溫控寄養：同一訪客重複看同篇只算一次、不同訪客各算一次、
// 頁尾顯示今日瀏覽、後台顯示統計、爬蟲不計、甲蟲店可篩選溫控寄養。
import { createRequire } from "node:module";
import { BASE, cleanup, launch, newUser, shot, sql, step } from "./helpers.mjs";
const { devices } = createRequire(import.meta.url)("playwright");

cleanup();
sql(`delete from public.site_daily_stats; delete from public.page_views_daily; delete from public.content_views; delete from private.view_dedupe;`);
const browser = await launch();
try {
  const a = await newUser(browser, "e2eViewA");
  sql(`update public.profiles set role = 'admin' where id = '${a.id}'`);
  const postId = sql(`insert into public.posts (author_id, category, title, body) values ('${a.id}', 'share', '瀏覽統計測試', '內容') returning id`).split("\n")[0];
  const settle = () => new Promise((r) => setTimeout(r, 800));

  const v1 = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await v1.goto(`${BASE}/posts/${postId}`);
  await settle();
  await v1.reload();
  await settle();
  const v2 = await (await browser.newContext({ ...devices["Pixel 7"] })).newPage();
  await v2.goto(`${BASE}/posts/${postId}`);
  await settle();
  const cv = sql(`select views from public.content_views where kind = 'post' and target_id = ${postId}`);
  if (cv !== "2") throw new Error("文章瀏覽數應為 2（同一訪客重看不重算），實際：" + cv);
  step("同一訪客重看不重算，兩位訪客＝瀏覽 2");

  const bot = await (await browser.newContext({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" })).newPage();
  const before = sql(`select coalesce(sum(views),0) from public.site_daily_stats`);
  await bot.goto(`${BASE}/posts/${postId}`);
  await settle();
  if (sql(`select coalesce(sum(views),0) from public.site_daily_stats`) !== before) throw new Error("爬蟲不應計入");
  step("搜尋引擎爬蟲不計入");

  await v2.reload();
  await v2.getByText(/瀏覽 2/).first().waitFor();
  await v2.getByText(/今日瀏覽 \d+・今日訪客 \d+・累計瀏覽 \d+/).waitFor();
  const visitors = sql(`select visitors from public.site_daily_stats`);
  step(`文章頁顯示瀏覽次數；頁尾顯示今日瀏覽與訪客（今日訪客 ${visitors}）`);

  await a.page.goto(`${BASE}/admin`);
  await a.page.getByText("瀏覽統計").waitFor();
  await a.page.getByText("近 7 天熱門頁面").waitFor();
  await a.page.getByRole("link", { name: `/posts/${postId}` }).waitFor();
  await shot(a.page, "views-admin");
  step("後台顯示瀏覽統計與熱門頁面");

  const r = await v2.request.post(`${BASE}/api/view`, { data: { path: "/admin" } });
  if (r.status() !== 204) throw new Error("api/view 狀態碼錯誤");
  if (sql(`select count(*) from public.page_views_daily where path like '/admin%'`) !== "0") throw new Error("後台路徑不應計入");
  step("後台路徑不計入");

  await v1.goto(`${BASE}/shops`);
  await v1.getByRole("link", { name: /只看可代客溫控寄養/ }).click();
  await v1.waitForURL(/boarding=1/);
  await v1.getByText("來點甲蟲 昆蟲生態館").waitFor();
  if (await v1.getByText("奇力貝舍甲蟲專賣店").count()) throw new Error("未提供寄養的店不應出現");
  await shot(v1, "shops-boarding");
  step("甲蟲店可篩選「代客溫控寄養」");
} finally {
  await browser.close();
  cleanup();
  sql(`delete from public.site_daily_stats; delete from public.page_views_daily; delete from public.content_views; delete from private.view_dedupe;`);
}
console.log("views.mjs 全部通過");
