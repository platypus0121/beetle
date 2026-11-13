// 影片 API 測試：以本機模擬的 Cloudflare API 驗證本站這一側的邏輯。
// 需以下列環境變數啟動 dev server：
//   CLOUDFLARE_ACCOUNT_ID=test CLOUDFLARE_STREAM_API_TOKEN=test CLOUDFLARE_STREAM_WEBHOOK_SECRET=whsec CLOUDFLARE_API_BASE=http://127.0.0.1:8787
import http from "node:http";
import { createHmac } from "node:crypto";
import { BASE, cleanup, launch, newUser, sql, step } from "./helpers.mjs";

const calls = [];
let n = 0;
const mock = http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, body: body ? JSON.parse(body) : null });
      res.setHeader("Content-Type", "application/json");
      if (req.method === "POST" && req.url.endsWith("/stream/direct_upload")) res.end(JSON.stringify({ success: true, result: { uid: `mockuid${Date.now()}${n++}`, uploadURL: "https://upload.example/xyz" } }));
      else res.end(JSON.stringify({ success: true, result: {} }));
    });
  })
  .listen(8787);

const sign = (body, secret = "whsec", time = Math.floor(Date.now() / 1000)) => `time=${time},sig1=${createHmac("sha256", secret).update(`${time}.${body}`).digest("hex")}`;
const hook = (body, sig) => fetch(`${BASE}/api/webhooks/cloudflare-stream`, { method: "POST", headers: { "Webhook-Signature": sig, "Content-Type": "application/json" }, body });

cleanup();
const browser = await launch();
try {
  const anon = await fetch(`${BASE}/api/video/upload-url`, { method: "POST", body: JSON.stringify({ purpose: "media", size: 1000 }) });
  if (anon.status !== 401) throw new Error("未登入應為 401，實際 " + anon.status);
  step("未登入拿不到上傳許可（401）");

  const u = await newUser(browser, "e2eVideo");
  sql(`update public.profiles set created_at = now() - interval '2 days' where id = '${u.id}'`); // 新帳號：每日 3 支
  const ask = (data) => u.page.request.post(`${BASE}/api/video/upload-url`, { data });
  const big = await ask({ purpose: "media", size: 101 * 1024 * 1024 });
  if (big.status() !== 413) throw new Error("超過 100MB 應為 413");
  step("超過 100 MB 被拒（413）");

  const ids = [];
  for (let i = 0; i < 3; i++) {
    const r = await ask({ purpose: "media", size: 5_000_000 });
    if (r.status() !== 200) throw new Error(`第 ${i + 1} 支應成功：` + (await r.text()));
    ids.push((await r.json()).id);
  }
  const first = calls.find((c) => c.url.endsWith("/direct_upload"));
  if (first.body.maxDurationSeconds !== 60 || first.auth !== "Bearer test" || first.body.requireSignedURLs !== false) throw new Error("送給 Cloudflare 的參數不符 " + JSON.stringify(first.body));
  step("核發 3 次上傳許可；向 Cloudflare 指定最長 60 秒，API 金鑰只在伺服器端送出");
  const fourth = await ask({ purpose: "media", size: 5_000_000 });
  if (fourth.status() !== 429) throw new Error("新帳號第 4 支應為 429");
  step("新帳號第 4 支被拒（429，每日上限 3 支）");

  // DOA：最長 180 秒、需簽名網址
  const u2 = await newUser(browser, "e2eVideo2");
  const doa = await u2.page.request.post(`${BASE}/api/video/upload-url`, { data: { purpose: "doa", size: 80_000_000 } });
  const doaCall = calls.filter((c) => c.url.endsWith("/direct_upload")).pop();
  if (doa.status() !== 200 || doaCall.body.maxDurationSeconds !== 180 || doaCall.body.requireSignedURLs !== true) throw new Error("開箱影片參數不符");
  step("開箱影片：最長 180 秒、設為需簽名網址才能觀看");

  // 停權者
  sql(`update public.profiles set banned_until = now() + interval '1 day' where id = '${u2.id}'`);
  const banned = await u2.page.request.post(`${BASE}/api/video/upload-url`, { data: { purpose: "media", size: 1000 } });
  if (banned.status() !== 403) throw new Error("停權者應為 403");
  step("停權者拿不到上傳許可（403）");

  // Webhook
  const uid = sql(`select stream_uid from public.video_uploads where id = ${ids[0]}`);
  const ready = JSON.stringify({ uid, readyToStream: true, duration: 42.5, size: 20_000_000, status: { state: "ready" } });
  if ((await hook(ready, "time=1,sig1=" + "0".repeat(64))).status !== 401) throw new Error("錯誤簽章應為 401");
  if ((await hook(ready, sign(ready, "wrong-secret"))).status !== 401) throw new Error("錯誤密鑰應為 401");
  if ((await hook(ready, sign(ready, "whsec", Math.floor(Date.now() / 1000) - 3600))).status !== 401) throw new Error("過期的簽章應為 401");
  if (sql(`select status from public.video_uploads where id = ${ids[0]}`) !== "pending") throw new Error("簽章錯誤不應改變狀態");
  step("Webhook 簽章錯誤、密鑰錯誤、時間過期都被拒（401），狀態不變");
  if ((await hook(ready, sign(ready))).status !== 200) throw new Error("正確簽章應成功");
  if (sql(`select status || '/' || duration_sec from public.video_uploads where id = ${ids[0]}`) !== "ready/42.5") throw new Error("未標為 ready");
  step("正確簽章：影片標為可用");

  const uid2 = sql(`select stream_uid from public.video_uploads where id = ${ids[1]}`);
  const huge = JSON.stringify({ uid: uid2, readyToStream: true, duration: 30, size: 150 * 1024 * 1024, status: { state: "ready" } });
  await hook(huge, sign(huge));
  if (sql(`select status from public.video_uploads where id = ${ids[1]}`) !== "error") throw new Error("超過大小應標為 error");
  if (!calls.some((c) => c.method === "DELETE" && c.url.endsWith(`/stream/${uid2}`))) throw new Error("超過大小應向 Cloudflare 刪除");
  step("轉檔後發現超過 100 MB：自動向 Cloudflare 刪除並標為無效");

  // 每日清理
  if ((await fetch(`${BASE}/api/cron/cleanup`)).status !== 401) throw new Error("清理 API 無密鑰應為 401");
  sql(`set session_replication_role = replica; update public.video_uploads set created_at = now() - interval '2 days' where id = ${ids[2]}; set session_replication_role = origin;`);
  const clean = await (await fetch(`${BASE}/api/cron/cleanup`, { headers: { Authorization: "Bearer local-cron-secret" } })).json();
  if (clean.orphanVideos < 1 || sql(`select status from public.video_uploads where id = ${ids[2]}`) !== "deleted") throw new Error("孤兒影片未清理 " + JSON.stringify(clean));
  step(`每日清理：無密鑰 401；刪除未使用的孤兒影片（${JSON.stringify(clean)}）`);
  console.log("video.mjs 全部通過");
} finally {
  await browser.close();
  mock.close();
  sql(`delete from public.video_uploads where stream_uid like 'mockuid%'`);
  cleanup();
}
