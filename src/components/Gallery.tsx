import type { MediaItem } from "@/lib/queries";
import { StreamPlayer } from "./StreamPlayer";

// 橫向滑動的照片／影片列（手機用手指滑，桌面可捲動）
export function Gallery({ media, youtubeId }: { media: MediaItem[]; youtubeId?: string | null }) {
  const images = media.filter((m) => m.kind === "image" && m.url);
  const videos = media.filter((m) => m.kind === "video" && m.stream_uid);
  if (!images.length && !videos.length && !youtubeId) return null;
  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:thin] sm:mx-0 sm:px-0">
          {images.map((m) => (
            <a key={m.id} href={m.url!} target="_blank" rel="noopener" className={`shrink-0 snap-center ${images.length === 1 ? "w-full" : "w-[85%] sm:w-[60%]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url!}
                alt=""
                width={m.width ?? undefined}
                height={m.height ?? undefined}
                loading="lazy"
                className="max-h-[70vh] w-full rounded-xl bg-wash object-contain"
              />
            </a>
          ))}
        </div>
      )}
      {videos.map((v) =>
        v.status === "ready" ? (
          <StreamPlayer key={v.id} uid={v.stream_uid!} />
        ) : (
          <p key={v.id} className="notice">
            影片處理中，稍後重新整理即可觀看。
          </p>
        ),
      )}
      {youtubeId && (
        <div className="aspect-video overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title="YouTube 影片"
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            className="size-full"
          />
        </div>
      )}
    </div>
  );
}
