// UX 改善的端對端檢查：表單失敗不清空、欄位錯誤、草稿還原、Toast、確認對話框、
// 商品頁底部購買列與照片輪播、交易篩選面板與條件標籤、返回鍵、載入骨架。
import { BASE, cleanup, launch, newUser, shot, sql, step, testImage, confirmIn } from "./helpers.mjs";

const see = (page, text) => page.getByText(text).first().waitFor({ timeout: 15000 });

cleanup();
const browser = await launch();
try {
  const a = await newUser(browser, "e2eUxA");
  const png = await testImage(browser);
  const p = a.page;

  // ── 發文：伺服器回錯誤時內容不會被清空，錯誤顯示在欄位旁 ──
  await p.goto(`${BASE}/posts/new`);
  await p.fill("#title", "換瓶紀錄");
  await p.fill("#body", "這段內文送出失敗也不該消失");
  await p.fill("#youtube", "not-a-youtube-link");
  await p.getByRole("button", { name: "發布" }).click();
  await see(p, "YouTube 連結格式不正確");
  if ((await p.inputValue("#title")) !== "換瓶紀錄" || (await p.inputValue("#body")) !== "這段內文送出失敗也不該消失")
    throw new Error("送出失敗後內容被清空");
  if ((await p.getAttribute("#youtube", "aria-invalid")) !== "true") throw new Error("出錯欄位沒有標記");
  await shot(p, "ux-01-field-error");
  step("發文失敗：已填內容保留，錯誤顯示在出錯欄位旁並標記");

  // ── 草稿：離開再回來可還原 ──
  await p.fill("#youtube", "");
  await p.fill("#title", "還沒寫完的草稿");
  await p.waitForTimeout(800);
  await p.goto(`${BASE}/market`);
  await p.goto(`${BASE}/posts/new`);
  await see(p, "有上次沒寫完的內容");
  await shot(p, "ux-02-draft-offer");
  await p.getByRole("button", { name: "還原" }).click();
  if ((await p.inputValue("#title")) !== "還沒寫完的草稿") throw new Error("草稿沒有還原");
  step("草稿自動保存，重新打開可一鍵還原");

  // ── 發布成功：Toast ──
  await p.setInputFiles('input[type="file"][accept="image/*"]', [{ name: "a.png", mimeType: "image/png", buffer: png }]);
  await p.waitForSelector('input[name="media_ids"]', { state: "attached", timeout: 30000 });
  await p.getByRole("button", { name: "發布" }).click();
  await p.waitForURL(/\/posts\/\d+$/);
  await see(p, "已發布");
  await shot(p, "ux-03-toast");
  step("發布後顯示「已發布」提示");
  await p.goto(`${BASE}/posts/new`);
  await p.waitForTimeout(1500);
  if (await p.getByText("有上次沒寫完的內容").count()) throw new Error("發布成功後草稿應清除");
  step("發布成功後草稿清除");

  // ── 確認對話框取代 confirm() ──
  await p.goBack();
  await p.waitForURL(/\/posts\/\d+$/);
  const postId = Number(p.url().split("/").pop());
  await p.getByRole("button", { name: "刪除", exact: true }).click();
  await p.locator("dialog[open]").waitFor();
  await shot(p, "ux-04-confirm");
  await p.locator("dialog[open]").getByRole("button", { name: "取消" }).click();
  if (sql(`select count(*) from public.posts where id = ${postId}`) !== "1") throw new Error("按取消不應刪除");
  await p.getByRole("button", { name: "刪除", exact: true }).click();
  await confirmIn(p, "刪除");
  await p.waitForURL(BASE + "/");
  await see(p, "文章已刪除");
  if (sql(`select count(*) from public.posts where id = ${postId}`) !== "0") throw new Error("確認後應刪除");
  step("刪除改用站內對話框：取消不刪、確定才刪，並顯示提示");

  // ── 商品頁：底部購買列、照片輪播 ──
  await p.goto(`${BASE}/market/new`);
  await p.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("Dynastes hercules");
  await p.getByRole("button", { name: /長戟大兜蟲/ }).click();
  await p.fill("#title", "UX 測試 長戟大兜蟲");
  await p.fill("#price", "6000");
  await p.getByText("黑貓宅急便", { exact: true }).click();
  await p.setInputFiles('input[type="file"][accept="image/*"] >> nth=0', [
    { name: "a.png", mimeType: "image/png", buffer: png },
    { name: "b.png", mimeType: "image/png", buffer: png },
  ]);
  await p.waitForSelector('input[name="media_ids"] >> nth=1', { state: "attached", timeout: 30000 });
  await p.check('input[name="agreed"]');
  await p.getByRole("button", { name: "上架", exact: true }).click();
  await p.waitForURL(/\/market\/\d+$/);
  await see(p, "商品已上架");
  const lid = p.url().split("/").pop();
  step("上架後顯示提示");

  const b = await newUser(browser, "e2eUxB");
  const q = b.page;
  await q.goto(`${BASE}/market`);
  await q.getByRole("link", { name: "UX 測試 長戟大兜蟲" }).click();
  await q.waitForURL(new RegExp(`/market/${lid}$`));
  const bar = q.locator(".fixed.bottom-0", { hasText: "我要購買" });
  await bar.waitFor();
  if (await q.locator(".bottom-nav").isVisible()) throw new Error("底部導覽應讓位給購買列");
  await see(q, "1 / 2");
  await shot(q, "ux-05-listing-sticky");
  await bar.getByRole("button", { name: "我要購買" }).click();
  await q.waitForFunction(() => document.activeElement?.id === "shipping", null, { timeout: 5000 });
  step("商品頁：底部固定價格與購買鈕，點一下捲到下單表單；照片顯示 1 / 2");
  await q.locator('button[aria-label="放大第 1 張照片"]').click();
  await q.locator("dialog[open] img").first().waitFor();
  await shot(q, "ux-06-lightbox");
  await q.locator("dialog[open]").getByRole("button", { name: "關閉" }).click();
  step("點照片全螢幕檢視");

  // ── 返回鍵 ──
  await q.getByRole("button", { name: "返回" }).click();
  await q.waitForURL(`${BASE}/market`);
  step("返回鍵回到交易列表");

  // ── 篩選面板與條件標籤 ──
  await q.getByRole("button", { name: /^篩選/ }).click();
  await q.locator("dialog[open]").waitFor();
  await q.locator("dialog[open]").locator('select[name="group"]').selectOption("rhino");
  await q.locator("dialog[open]").locator('input[name="min"]').fill("5000");
  await shot(q, "ux-07-filter-sheet");
  await q.locator("dialog[open]").getByRole("button", { name: "套用" }).click();
  await q.waitForURL(/group=rhino/);
  await see(q, "UX 測試 長戟大兜蟲");
  await q.getByRole("link", { name: "移除條件：兜蟲" }).waitFor();
  await shot(q, "ux-08-filter-chips");
  await q.getByRole("link", { name: "移除條件：兜蟲" }).click();
  await q.waitForURL((u) => !u.search.includes("group="));
  if (!(await q.getByRole("link", { name: /移除條件：.*NT\$5,000/ }).count())) throw new Error("價格條件應保留");
  step("篩選面板套用後顯示條件標籤，點 ✕ 單獨移除");
  await q.selectOption('select[name="sort"]', "price_desc");
  await q.waitForURL(/sort=price_desc/);
  step("排序選了立即生效");

  // ── 載入骨架（慢速網路）──
  const cdp = await q.context().newCDPSession(q);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: 200000, uploadThroughput: 200000 });
  await q.getByRole("link", { name: "品種" }).first().click();
  await q.locator('[aria-busy="true"]').first().waitFor({ timeout: 8000 });
  await shot(q, "ux-09-skeleton");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  step("慢速網路換頁時先顯示骨架");

  // ── 404 狀態碼 ──
  const r1 = await q.request.get(`${BASE}/this-page-does-not-exist`);
  const r2 = await q.request.get(`${BASE}/market/99999999`);
  if (r1.status() !== 404 || r2.status() !== 404) throw new Error(`404 狀態碼錯誤：${r1.status()} / ${r2.status()}`);
  step("不存在的頁面與商品仍回傳 404");
} finally {
  await browser.close();
  cleanup();
}
console.log("UX e2e 通過");
