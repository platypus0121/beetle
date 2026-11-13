import "server-only";
import { createSign } from "node:crypto";

// Cloudflare Stream 串接。金鑰只存在伺服器環境變數。
const API = "https://api.cloudflare.com/client/v4";

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
