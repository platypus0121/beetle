"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, extOf } from "@/lib/image-compress";
import { mediaUrl } from "@/lib/format";

export type UploadedImage = { id: number; url: string };

// 多張照片上傳：選檔 → 瀏覽器壓縮 → 傳到 Storage 自己的資料夾 → 登記為「待驗證」。
// 送出表單時伺服器會再驗證一次並掛到內容上。
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
  const [images, setImages] = useState<UploadedImage[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function update(next: UploadedImage[]) {
    setImages(next);
    onChange?.(next);
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - images.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(`最多 ${max} 張，已略過多出的照片`);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setError("請先登入");
    setBusy(list.length);
    let current = images;
    for (const file of list) {
      try {
        const blob = await compressImage(file);
        const path = `${auth.user.id}/${crypto.randomUUID()}.${extOf(blob)}`;
        const up = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
        if (up.error) throw new Error(/row-level|policy/i.test(up.error.message) ? "沒有上傳權限（帳號可能被停權或今日已達上限）" : "上傳失敗，請再試一次");
        const { data, error: insErr } = await supabase.from("media").insert({ owner_id: auth.user.id, kind: "image", path }).select("id").single();
        if (insErr || !data) {
          await supabase.storage.from("media").remove([path]);
          throw new Error(insErr?.code === "P0001" ? insErr.message : "上傳失敗，請再試一次");
        }
        current = [...current, { id: data.id, url: mediaUrl(path)! }];
        update(current);
      } catch (e) {
        setError(e instanceof Error ? e.message : "上傳失敗");
      }
      setBusy((n) => n - 1);
    }
    setBusy(0);
    if (input.current) input.current.value = "";
  }

  async function remove(img: UploadedImage) {
    update(images.filter((i) => i.id !== img.id));
    const supabase = createClient();
    await supabase.from("media").delete().eq("id", img.id);
  }

  return (
    <div>
      {images.map((i) => (
        <input key={i.id} type="hidden" name={name} value={i.id} />
      ))}
      <div className={`grid gap-2 ${compact ? "grid-cols-5" : "grid-cols-3 sm:grid-cols-5"}`}>
        {images.map((i, idx) => (
          <div key={i.id} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-wash">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.url} alt="" className="size-full object-cover" />
            {idx === 0 && !compact && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">封面</span>}
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
        {Array.from({ length: busy }).map((_, i) => (
          <div key={`b${i}`} className="aspect-square animate-pulse rounded-lg bg-wash" />
        ))}
        {images.length + busy < max && (
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
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {!compact && (
        <p className="hint">
          {images.length}/{max} 張。上傳前會自動壓縮並移除拍攝地點資訊。
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
