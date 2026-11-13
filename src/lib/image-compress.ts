import { LIMITS } from "./constants";

// 上傳前在瀏覽器壓縮：長邊最多 2048px、目標約 0.5 MB。
// 重新編碼會一併去除 EXIF（含拍攝地點），原圖不會離開使用者的裝置。
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("只能上傳圖片");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("無法讀取這張圖片，請改用 JPG 或 PNG");
  }
  let scale = Math.min(1, LIMITS.imageMaxEdge / Math.max(bitmap.width, bitmap.height));
  let best: Blob | null = null;
  for (let pass = 0; pass < 5; pass++) {
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("瀏覽器不支援圖片處理");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    for (const q of [0.82, 0.72, 0.62, 0.5]) {
      let blob = await toBlob(canvas, "image/webp", q);
      // 不支援 WebP 編碼的瀏覽器會退回 PNG，改用 JPEG
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", q);
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= LIMITS.imageTargetBytes) {
        bitmap.close();
        return blob;
      }
    }
    scale *= 0.8;
  }
  bitmap.close();
  if (!best || best.size > LIMITS.imageMaxBytes) throw new Error("圖片壓縮後仍然太大");
  return best;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export function extOf(blob: Blob): string {
  return blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
}
