export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; field?: string };

// 把資料庫錯誤轉成給使用者看的訊息。資料庫函式自己丟出的中文訊息（P0001）直接顯示。
export function dbError(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return "發生錯誤，請稍後再試";
  if (e.code === "P0001" && e.message) return e.message;
  if (e.code === "23505") return "資料重複了";
  if (e.code === "23514") return "內容格式不符合規定";
  if (e.code === "42501" || /row-level security/.test(e.message ?? ""))
    return "沒有權限執行這個操作（帳號可能被停權）";
  if (e.code === "23503") return "找不到相關資料";
  return "發生錯誤，請稍後再試";
}

export const fail = (error: string, field?: string) => ({ ok: false as const, error, ...(field ? { field } : {}) });
