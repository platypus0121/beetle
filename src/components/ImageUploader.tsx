"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, extOf } from "@/lib/image-compress";
import { mediaUrl } from "@/lib/format";

export type UploadedImage = { id: number; url: string };

type Item = {
  key: string;
  status: "compressing" | "uploading" | "done" | "error";
  preview: string;
  file?: File;
  id?: number;
  url?: string;
  error?: string;
};

// 多張照片上傳：選檔 → 瀏覽器壓縮 → 傳到 Storage 自己的資料夾 → 登記為「待驗證」。
// 每張各自顯示狀態；失敗的那張可以單獨重試；可調整順序（第一張是封面）。
// 送出表單時伺服器會再驗證一次並依這裡的順序掛到內容上。
export function ImageUploader({
  max,
  name = "media_ids",
  initial = [],
  compact = false,
  onChange,
}: {
  max: number;
  name?: string;
  initial?: UploadedImage[];
  compact?: boolean;
  onChange?: (images: UploadedImage[]) => void;
}) {
  const [items, setItems] = useState<Item[]>(() => initial.map((i) => ({ key: `i${i.id}`, status: "done", preview: i.url, id: i.id, url: i.url })));
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const latest = useRef(items);
  useEffect(() => {
    latest.current = items;
  }, [items]);

  const done = items.filter((i) => i.status === "done" && i.id);
  const doneKey = done.map((d) => d.id).join(",");
  // 已完成的照片（含順序）變動時通知父元件
  useEffect(() => {
    onChange?.(items.filter((i) => i.status === "done" && i.id).map((i) => ({ id: i.id!, url: i.url! })));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在完成清單或順序改變時通知
  }, [doneKey]);

  // 離開頁面時釋放本機預覽
  useEffect(
    () => () => {
      for (const i of latest.current) if (i.preview.startsWith("blob:")) URL.revokeObjectURL(i.preview);
    },
    [],
  );

  const patch = (key: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  async function upload(item: Item) {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return patch(item.key, { status: "error", error: "請先登入" });
    try {
      patch(item.key, { status: "compressing", error: undefined });
      const blob = await compressImage(item.file!);
      patch(item.key, { status: "uploading" });
      const path = `${auth.user.id}/${crypto.randomUUID()}.${extOf(blob)}`;
      const up = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (up.error) throw new Error(/row-level|policy/i.test(up.error.message) ? "沒有上傳權限（帳號可能被停權或今日已達上限）" : "上傳失敗");
      const { data, error: insErr } = await supabase.from("media").insert({ owner_id: auth.user.id, kind: "image", path }).select("id").single();
      if (insErr || !data) {
        await supabase.storage.from("media").remove([path]);
        throw new Error(insErr?.code === "P0001" ? insErr.message : "上傳失敗");
      }
      patch(item.key, { status: "done", id: data.id, url: mediaUrl(path)!, file: undefined });
    } catch (e) {
      patch(item.key, { status: "error", error: e instanceof Error ? e.message : "上傳失敗" });
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setNotice(null);
    const room = max - items.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) setNotice(`最多 ${max} 張，已略過多出的 ${files.length - list.length} 張`);
    const added: Item[] = list.map((file) => ({ key: crypto.randomUUID(), status: "compressing", preview: URL.createObjectURL(file), file }));
    setItems((cur) => [...cur, ...added]);
    if (input.current) input.current.value = "";
    // 一張一張傳，手機網路不穩時比較不會全部失敗
    for (const it of added) await upload(it);
  }

  async function remove(item: Item) {
    setItems((list) => list.filter((i) => i.key !== item.key));
    if (item.preview.startsWith("blob:")) URL.revokeObjectURL(item.preview);
    if (item.id) await createClient().from("media").delete().eq("id", item.id);
  }

  const move = (idx: number, to: number) =>
    setItems((list) => {
      const next = [...list];
      const [it] = next.splice(idx, 1);
      next.splice(to, 0, it);
      return next;
    });

  const working = items.filter((i) => i.status === "compressing" || i.status === "uploading").length;
  const failed = items.filter((i) => i.status === "error").length;

  return (
    <div>
      {items.map((i) =>
        i.status === "done" && i.id ? <input key={i.key} type="hidden" name={name} value={i.id} /> : null,
      )}
      <div className={`grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-3 sm:grid-cols-5"}`}>
        {items.map((i, idx) => (
          <div key={i.key} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-wash">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.preview} alt="" className={`size-full object-cover ${i.status === "done" ? "" : "opacity-50"}`} />
            {(i.status === "compressing" || i.status === "uploading") && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-ink">
                <span className="spinner text-accent" aria-hidden />
                {i.status === "compressing" ? "壓縮中" : "上傳中"}
              </span>
            )}
            {i.status === "error" && (
              <button
                type="button"
                onClick={() => upload(i)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-danger-wash/80 px-1 text-center text-[11px] text-danger"
                title={i.error}
              >
                <span className="text-base leading-none">↻</span>
                重試
              </button>
            )}
            {idx === 0 && !compact && i.status === "done" && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">封面</span>}
            {idx > 0 && !compact && i.status === "done" && (
              <button
                type="button"
                aria-label="往前移"
                title="往前移（第一張是封面）"
                onClick={() => move(idx, idx - 1)}
                className="absolute bottom-1 left-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
              >
                ‹
              </button>
            )}
            <button
              type="button"
              aria-label="移除照片"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
            >
              ×
            </button>
          </div>
        ))}
        {items.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center rounded-lg border border-dashed border-line text-xs text-sub hover:bg-wash"
          >
            <span className="text-2xl leading-none">＋</span>
            {!compact && <span className="mt-1">照片</span>}
          </button>
        )}
      </div>
      {working > 0 && <PendingGuard />}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {!compact && (
        <p className="hint">
          {done.length}/{max} 張{working > 0 && `・處理中 ${working} 張`}。上傳前會自動壓縮並移除拍攝地點資訊{items.length > 1 && "，按「‹」可調整順序"}。
        </p>
      )}
      {failed > 0 && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {failed} 張上傳失敗（{items.find((i) => i.status === "error")?.error}），點該張照片可重試，或按 × 移除。
        </p>
      )}
      {notice && <p className="mt-1 text-xs text-warn">{notice}</p>}
    </div>
  );
}

// 照片還在上傳時擋住表單送出（瀏覽器會在這裡跳出提示）
function PendingGuard() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.setCustomValidity("照片還在上傳中，請稍候再送出"), []);
  return <input ref={ref} required tabIndex={-1} aria-hidden className="sr-only" value="" onChange={() => {}} />;
}
