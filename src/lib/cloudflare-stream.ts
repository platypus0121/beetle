import "server-only";
import { createHmac, createSign, timingSafeEqual } from "node:crypto";

// Cloudflare Stream 串接。金鑰只存在伺服器環境變數。
// 測試時可用 CLOUDFLARE_API_BASE 指向模擬伺服器
const API = process.env.CLOUDFLARE_API_BASE ?? "https://api.cloudflare.com/client/v4";

function creds() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!account || !token) return null;
  return { account, token };
}

// 建立一次性上傳網址。maxDurationSeconds 由 Cloudflare 端強制：超過長度的影片會被拒收。
export async function createDirectUpload(opts: { userId: string; purpose: "media" | "doa"; maxDurationSeconds: number }) {
  const c = creds();
  if (!c) return null;
  const res = await fetch(`${API}/accounts/${c.account}/stream/direct_upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      maxDurationSeconds: opts.maxDurationSeconds,
      expiry: new Date(Date.now() + 30 * 60_000).toISOString(),
      requireSignedURLs: opts.purpose === "doa",
      creator: opts.userId,
      meta: { purpose: opts.purpose },
    }),
  });
  const json = (await res.json()) as { success: boolean; result?: { uid: string; uploadURL: string } };
  if (!res.ok || !json.success || !json.result) return null;
  return json.result;
}

export async function getVideo(uid: string) {
  const c = creds();
  if (!c) return null;
  const res = await fetch(`${API}/accounts/${c.account}/stream/${uid}`, { headers: { Authorization: `Bearer ${c.token}` } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: { uid: string; duration: number; size: number; readyToStream: boolean; status?: { state: string }; input?: { width: number; height: number } };
  };
  return json.result ?? null;
}

// 把影片改成需簽名網址才能觀看（開箱影片的第二道保險）
export async function requireSignedUrls(uid: string) {
  const c = creds();
  if (!c) return false;
  const res = await fetch(`${API}/accounts/${c.account}/stream/${uid}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uid, requireSignedURLs: true }),
  });
  return res.ok;
}

// 驗證 Cloudflare Stream webhook 簽章。
// 標頭格式：Webhook-Signature: time=<unix 秒>,sig1=<hex>；簽章 = HMAC-SHA256(secret, `${time}.${原始 body}`)
export function verifyWebhook(rawBody: string, header: string | null, secret: string, toleranceSec = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  const time = Number(parts.time);
  const sig = parts.sig1;
  if (!time || !sig || !/^[0-9a-f]{64}$/i.test(sig)) return false;
  if (Math.abs(Date.now() / 1000 - time) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${parts.time}.${rawBody}`).digest();
  const given = Buffer.from(sig, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function deleteVideo(uid: string) {
  const c = creds();
  if (!c) return false;
  const res = await fetch(`${API}/accounts/${c.account}/stream/${uid}`, { method: "DELETE", headers: { Authorization: `Bearer ${c.token}` } });
  return res.ok || res.status === 404;
}

// 私有影片（開箱影片）的觀看 token：以簽署金鑰在本機簽發，10 分鐘有效。
export async function signedStreamToken(uid: string): Promise<string | null> {
  const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
  const pemB64 = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_PEM;
  if (!keyId || !pemB64) return null;
  try {
    const pem = pemB64.includes("BEGIN") ? pemB64 : Buffer.from(pemB64, "base64").toString("utf8");
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const head = enc({ alg: "RS256", kid: keyId });
    const body = enc({ sub: uid, kid: keyId, exp: Math.floor(Date.now() / 1000) + 600 });
    const sig = createSign("RSA-SHA256").update(`${head}.${body}`).sign(pem).toString("base64url");
    return `${head}.${body}.${sig}`;
  } catch {
    return null;
  }
}
