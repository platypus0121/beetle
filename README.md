# 台灣甲蟲論壇1.0 — 鍬形蟲・兜蟲・金龜

會員、文章（圖／文／影片）、留言、交易（直購與拍賣競標）、交易單與付款紀錄、私訊、好友、飼育紀錄、甲蟲店名錄、版主後台。白底、手機優先、全繁體中文。

技術棧：Next.js（App Router）＋ TypeScript ＋ Tailwind CSS ＋ Supabase（Auth、Postgres、Storage、Realtime、Cron）。影片上傳接 Cloudflare Stream（選用）。

## 設計原則

**安全規則放在資料庫。** 瀏覽器拿得到 Supabase 的公開金鑰，任何人都能繞過網頁直接呼叫 API，所以下列規則都寫在 Postgres 裡（`supabase/migrations/`），Next.js 只是第二道檢查：

| 規則 | 實作位置 |
|---|---|
| 每張表都開 RLS，只能存取自己的資料 | `…0002_rls.sql` |
| 保育類擋上架、台灣產活體需飼育證明 | `…0003_rules_triggers.sql` 的 `tg_listing_guard` |
| 限流（發文、留言、上架、出價、私訊、檢舉…） | `tg_rate_limit` 與各函式 |
| 防廣告（新帳號不能貼連結／上架／出價、禁用詞、重複內容、3 人檢舉自動隱藏） | `content_guard`、`tg_report_after` |
| 出價防並發（`SELECT … FOR UPDATE`）、最後 5 分鐘延標、自動出價 | `place_bid()` |
| 排程結標、自動完成交易、換瓶提醒（每分鐘） | `run_maintenance()` ＋ `…0006_cron.sql` |
| 交易狀態機：只有 `order_transition()` 能改狀態，每一步寫時間軸並通知 | `order_transition()` |
| 時間軸與信用分紀錄不可修改、不可刪除 | `tg_immutable` |
| 照片大小與格式、只能寫自己的資料夾 | `…0004_storage.sql` |
| 每則內容的照片／影片數量上限、每日影片數 | `tg_media_limit`、`tg_video_quota` |

**金鑰。** `SUPABASE_SERVICE_ROLE_KEY`、Cloudflare token、`CRON_SECRET` 只在伺服器使用（相關檔案都有 `import "server-only"`，被前端引用會建置失敗）。前端只有 `NEXT_PUBLIC_` 開頭的公開值。

**平台不碰錢。** 只允許轉帳或面交；收款帳戶、付款回報、出貨、收貨都記在站內交易單，私訊出現帳號或匯款字樣會跳出詐騙警示。

## 本機開發

需要 Node 20+、Docker。

```bash
npm install
```

```bash
npx supabase start
```

`supabase start` 會套用所有 migration 並印出本機的 URL 與金鑰。把它們填進 `.env.local`（格式見 `.env.example`），然後：

```bash
npm run dev
```

開 http://127.0.0.1:3000 。本機的 Email 註冊不需要收驗證信。

### 測試

```bash
npm run test:db
```

資料庫規則測試（168 項：RLS、保育類、飼育證明、限流、交易狀態機、拍賣、好友私訊、媒體上限、Storage）加上兩個連線同時出價的並發測試。整份在交易內執行後 rollback，不留資料。

```bash
npm run test:e2e
```

以手機尺寸的瀏覽器實際操作（需先 `npm run dev` 或 `npm run build && npm start`，並安裝 Playwright）。涵蓋發文與留言、上架與下單到互評、拍賣競標到排程結標、好友與私訊、飼育紀錄、檢舉與版主處置。

`e2e/video.mjs` 用模擬的 Cloudflare API 測試影片上傳許可、每日上限與 webhook 簽章，啟動方式寫在檔案開頭。

## 部署

### 1. Supabase

1. 建立專案，取得 Project URL、anon（publishable）key、service_role（secret）key。
2. 套用資料庫：
   ```bash
   npx supabase link --project-ref <你的專案代號>
   ```
   ```bash
   npx supabase db push
   ```
3. **Database → Extensions** 啟用 `pg_cron`（`…0006_cron.sql` 需要它；每分鐘結標與提醒靠這個）。
4. **Authentication → URL Configuration**：Site URL 填正式網址，Redirect URLs 加上 `https://你的網域/auth/callback`。
5. **Authentication → Providers** 啟用需要的登入方式（見下）。
6. 建議啟用 **Attack Protection → CAPTCHA（Cloudflare Turnstile）**，並把 site key 填到 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`。
7. 影片若要支援到 100 MB，與 Supabase 無關（影片不經過 Supabase）；照片單檔上限 1.5 MB，免費方案即可。

### 2. 登入方式

`NEXT_PUBLIC_AUTH_PROVIDERS` 列出要顯示的按鈕，例如 `google,facebook,x,line`。沒列的不會顯示。

| 方式 | 設定 |
|---|---|
| Email | 內建。正式環境請在 Supabase 設定 SMTP，否則寄信量很低 |
| Google | Google Cloud Console 建立 OAuth 用戶端，回呼網址填 Supabase 提供的 `…/auth/v1/callback` |
| Facebook | Meta for Developers 建立應用程式，同上 |
| X | X Developer Portal 建立 OAuth 2.0 應用程式，在 Supabase 啟用「X」provider |
| LINE | LINE Developers 建立 LINE Login channel（開啟 OpenID Connect 與 email 權限）。在 Supabase 新增**自訂 OIDC provider**，識別碼填 `line`（程式以 `custom:line` 呼叫），issuer 為 `https://access.line.me` |

### 3. 環境變數

見 `.env.example`。必填五個：Supabase URL、anon key、service_role key、`NEXT_PUBLIC_SITE_URL`、`CRON_SECRET`。

### 4. 每日清理排程

`/api/cron/cleanup` 會刪除交易結束滿 90 天的開箱影片、以及上傳後 24 小時沒用到的照片與影片。需以 `Authorization: Bearer <CRON_SECRET>` 呼叫。部署在 Vercel 時 `vercel.json` 已設定每天執行一次（Vercel 會自動帶上 `CRON_SECRET`）；其他平台請自行設定排程。

### 5. 影片上傳（選用）

沒設定 Cloudflare 時，站上只開放 YouTube 連結，其他功能不受影響。

1. Cloudflare 開通 Stream，建立有 Stream 編輯權限的 API token，填入 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_STREAM_API_TOKEN`。
2. 設定 webhook 指向 `https://你的網域/api/webhooks/cloudflare-stream`，把回傳的 secret 填入 `CLOUDFLARE_STREAM_WEBHOOK_SECRET`。
3. 開箱影片是私有的：建立 Stream signing key，填入 `CLOUDFLARE_STREAM_SIGNING_KEY_ID` 與 `CLOUDFLARE_STREAM_SIGNING_KEY_PEM`。
4. `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER` 填播放網域 `customer-<代碼>.cloudflarestream.com` 中的代碼。

> **尚未以真實 Cloudflare 帳號實測。** 本站這一側的邏輯（核發許可、每日上限、webhook 驗簽、超過大小刪除、清理）已用模擬 API 測過；實際上傳、轉檔、播放與簽名網址需要你提供金鑰後再驗證一次。
> 限制方式：最長秒數（一般 60 秒、開箱 3 分鐘）由 Cloudflare 在上傳時強制；100 MB 大小上限由前端先擋，轉檔完成後伺服器再檢查，超過就刪除。Stream 會自動轉成多種畫質串流；是否能把最高畫質鎖在 720p 我沒能查到官方文件確認，目前沒有做這項設定。

### 6. 指定第一位管理員

註冊帳號後，在 Supabase SQL Editor 執行（之後的版主可由管理員在後台「會員」指派）：

```sql
update public.profiles set role = 'admin' where username = '你的暱稱';
```

## 上線前請站方確認

- **保育類名單**：種子資料只標記了臺灣大鍬形蟲、長角大鍬形蟲、臺灣長臂金龜。請對照農業部最新公告的保育類野生動物名錄，在後台「物種」補齊。
- **物種表**：52 種常見種，學名與日文名為盡力整理，請同好協助校對；會員可提報新物種。
- **甲蟲店名錄**：目前 9 間，只收錄搜尋得到官網或官方社群佐證的店；查不清楚的營業時間顯示「請洽店家」。開發環境無法直接開啟店家網站逐頁查證，上線前請再確認一次，並在後台「店家」補上其他店。
- **服務條款與隱私權政策**：依實際功能寫成的範本，請依營運主體與法律意見修訂。
- **禁用詞**：內建少量常見廣告詞，請依實際狀況在後台增減。

## 目錄

```
supabase/migrations/   資料表、RLS、規則與函式、Storage、種子資料、排程
supabase/tests/        資料庫規則測試與並發測試
src/proxy.ts           每個請求更新登入狀態並加上 CSP
src/lib/supabase/      client（瀏覽器）、server（登入者身分）、admin（service_role，僅伺服器）
src/lib/               驗證、圖片壓縮、媒體驗證、Cloudflare Stream、格式化
src/app/               頁面與 Server Actions
src/components/        共用元件
e2e/                   端對端測試
```
