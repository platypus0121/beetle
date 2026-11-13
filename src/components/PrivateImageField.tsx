"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, extOf } from "@/lib/image-compress";

// 上傳到私有 bucket 的單張圖片（飼育證明、付款截圖、私訊圖片）。只回傳路徑，不公開。
export function PrivateImageField({
  name,
  label,
  prefix,
  initialPath = null,
  onChange,
}: {
  name: string;
  label: string;
  prefix: string;
  initialPath?: string | null;
  onChange?: (path: string | null) => void;
}) {
  const [path, setPath] = useState<string | null>(initialPath);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("請先登入");
      const blob = await compressImage(file);
      const p = `${auth.user.id}/${prefix}-${crypto.randomUUID()}.${extOf(blob)}`;
      const { error: upErr } = await supabase.storage.from("private").upload(p, blob, { contentType: blob.type });
      if (upErr) throw new Error("上傳失敗，請再試一次");
      setPath(p);
      onChange?.(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <input type="hidden" name={name} value={path ?? ""} />
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "上傳中…" : path ? `更換${label}` : `上傳${label}`}
        </button>
        {path && <span className="text-sm text-accent">✓ 已上傳</span>}
        {path && (
          <button
            type="button"
            className="text-xs text-sub"
            onClick={() => {
              setPath(null);
              onChange?.(null);
            }}
          >
            移除
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
