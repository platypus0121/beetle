"use client";
import { useRef, useState } from "react";
import { LIMITS } from "@/lib/constants";

// 影片上傳：前端先檢查長度與大小 → 向本站伺服器申請一次性上傳網址（伺服器檢查每日上限，
// 並在 Cloudflare 端設定最長秒數）→ 瀏覽器直接傳到 Cloudflare Stream。
export function VideoField({
  purpose = "media",
  name = "video_upload_id",
  enabled,
  onUploaded,
}: {
  purpose?: "media" | "doa";
  name?: string;
  enabled: boolean;
  onUploaded?: (id: number | null) => void;
}) {
  const maxSec = purpose === "doa" ? LIMITS.doaVideoMaxSeconds : LIMITS.videoMaxSeconds;
  const maxBytes = purpose === "doa" ? LIMITS.doaVideoMaxBytes : LIMITS.videoMaxBytes;
  const [id, setId] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const input = useRef<HTMLInputElement>(null);

  if (!enabled) {
    return <p className="hint">本站尚未開放影片上傳{purpose === "media" ? "，可以改貼 YouTube 連結" : "，請聯絡站方"}。</p>;
  }

  function duration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(v.src);
        resolve(v.duration);
      };
      v.onerror = () => reject(new Error("無法讀取這支影片"));
      v.src = URL.createObjectURL(file);
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      if (!/^video\/(mp4|quicktime|webm)$/.test(file.type)) throw new Error("只接受 MP4、MOV 或 WebM 影片");
      if (file.size > maxBytes) throw new Error(`影片不能超過 ${Math.round(maxBytes / 1048576)} MB`);
      const sec = await duration(file);
      if (!Number.isFinite(sec) || sec > maxSec + 0.5) throw new Error(`影片長度不能超過 ${maxSec >= 120 ? `${maxSec / 60} 分鐘` : `${maxSec} 秒`}`);
      setProgress(0);
      const res = await fetch("/api/video/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, size: file.size }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "無法取得上傳許可");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", json.uploadURL);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("影片上傳失敗（可能超過長度限制）")));
        xhr.onerror = () => reject(new Error("網路中斷，請重新上傳"));
        const body = new FormData();
        body.append("file", file);
        xhr.send(body);
      });
      setId(json.id);
      setFileName(file.name);
      onUploaded?.(json.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上傳失敗");
    }
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      {id && <input type="hidden" name={name} value={id} />}
      {id ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
          <span className="truncate">✓ {fileName}（已上傳，處理完成後即可播放）</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setId(null);
              onUploaded?.(null);
            }}
          >
            移除
          </button>
        </div>
      ) : progress !== null ? (
        <div className="rounded-lg border border-line px-3 py-3 text-sm">
          上傳中 {progress}%
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-wash">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <button type="button" className="btn w-full" onClick={() => input.current?.click()}>
          ＋ 選擇影片
        </button>
      )}
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <p className="hint">
        {purpose === "doa"
          ? "最長 3 分鐘。請從未拆封開始一刀未剪拍到確認個體狀況。此影片僅交易雙方與站方可看，交易結束 90 天後自動刪除。"
          : "最長 60 秒、100 MB 以內，上傳後自動轉為 720p。"}
      </p>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
