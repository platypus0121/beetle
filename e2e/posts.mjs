import { BASE, cleanup, launch, newUser, shot, sql, step, testImage } from "./helpers.mjs";

cleanup();
const browser = await launch();
try {
  const a = await newUser(browser, "e2eAlice");
  step("註冊並設定暱稱");
  const png = await testImage(browser);

  await a.page.goto(`${BASE}/posts/new`);
  await a.page.getByPlaceholder("輸入俗名、學名或日文名搜尋").fill("ヘラクレス");
  await a.page.getByRole("button", { name: /長戟大兜蟲/ }).click();
  await a.page.fill("#title", "我的第一隻長戟");
  await a.page.fill("#body", "三齡後期 110g，準備換瓶。\n參考 https://example.com/guide <script>alert(1)</script>");
  await a.page.setInputFiles('input[type="file"][accept="image/*"]', [
    { name: "a.png", mimeType: "image/png", buffer: png },
    { name: "b.png", mimeType: "image/png", buffer: png },
  ]);
  await a.page.waitForSelector('input[name="media_ids"] >> nth=1', { state: "attached", timeout: 30000 });
  await shot(a.page, "01-post-form");
  await a.page.getByRole("button", { name: "發布" }).click();
  await a.page.waitForURL(/\/posts\/\d+$/);
  const postId = Number(a.page.url().split("/").pop());
  const media = sql(`select count(*) || ',' || max(greatest(width,height)) || ',' || bool_and(status = 'ready') from public.media where attached_type = 'post' and attached_id = ${postId}`);
  if (media !== "2,2048,true") throw new Error("照片未正確壓縮或驗證：" + media);
  step("發文含 2 張照片：瀏覽器壓縮到長邊 2048，伺服器驗證後標為 ready");
  const bytes = sql(`select max((metadata->>'size')::int) from storage.objects where owner_id = '${a.id}'`);
  if (Number(bytes) > 520 * 1024) throw new Error("壓縮後仍超過 0.5 MB：" + bytes);
  step(`壓縮後最大檔案 ${Math.round(bytes / 1024)} KB`);
  if (await a.page.locator("article script:not([type])").count()) throw new Error("XSS：script 被注入");
  if (!(await a.page.getByText("<script>alert(1)</script>").count())) throw new Error("script 標籤應以純文字顯示");
  const link = a.page.locator('article a[href="https://example.com/guide"]');
  if ((await link.getAttribute("rel")) !== "nofollow ugc noopener noreferrer") throw new Error("連結 rel 不正確");
  step("內文中的 <script> 以純文字顯示，網址轉成 nofollow 連結");
  await shot(a.page, "02-post-detail");

  const b = await newUser(browser, "e2eBob");
  await b.page.goto(`${BASE}/posts/${postId}`);
  await b.page.getByRole("button", { name: /喜歡/ }).click();
  await b.page.getByPlaceholder(/留言/).fill("好大隻！@e2eAlice 請問用什麼土？");
  await b.page.setInputFiles('section input[type="file"]', [{ name: "c.png", mimeType: "image/png", buffer: png }]);
  await b.page.waitForSelector('section input[name="media_ids"]', { state: "attached", timeout: 30000 });
  await b.page.getByRole("button", { name: "留言", exact: true }).click();
  await b.page.getByText("好大隻！").waitFor();
  step("另一位會員按讚、留言附照片");
  await a.page.reload();
  await a.page.getByRole("button", { name: "回覆", exact: true }).first().click();
  await a.page.getByPlaceholder("回覆…").fill("用發酵木屑");
  await a.page.getByRole("button", { name: "回覆", exact: true }).last().click();
  await a.page.getByText("用發酵木屑").waitFor();
  step("作者回覆留言");
  const counts = sql(`select like_count || '/' || comment_count from public.posts where id = ${postId}`);
  if (counts !== "1/2") throw new Error("計數不正確 " + counts);
  const notif = sql(`select string_agg(type, ',' order by id) from public.notifications where user_id = '${a.id}'`);
  if (!/like/.test(notif) || !/comment/.test(notif)) throw new Error("通知缺漏 " + notif);
  step(`作者收到通知：${notif}`);
  await shot(a.page, "03-comments");
  await a.page.goto(BASE + "/");
  await a.page.getByText("我的第一隻長戟").waitFor();
  await shot(a.page, "04-home");
  step("首頁列表顯示文章");
  console.log("posts.mjs 全部通過");
} finally {
  await browser.close();
  cleanup();
}
