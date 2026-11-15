"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/lib/queries";
import { StreamPlayer } from "./StreamPlayer";

// 照片輪播：手指左右滑（scroll-snap）、下方圓點與張數；點照片全螢幕檢視，可繼續滑動。
export function Gallery({ media, youtubeId }: { media: MediaItem[]; youtubeId?: string | null }) {
  const images = media.filter((m) => m.kind === "image" && m.url);
  const videos = media.filter((m) => m.kind === "video" && m.stream_uid);
  const [index, setIndex] = useState(0);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const strip = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const zoomStrip = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (zoomAt === null) return;
    dialog.current?.showModal();
    const el = zoomStrip.current;
    if (el) el.scrollLeft = zoomAt * el.clientWidth;
  }, [zoomAt]);

  if (!images.length && !videos.length && !youtubeId) return null;
  const many = images.length > 1;

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="relative -mx-4 sm:mx-0">
          <div
            ref={strip}
            className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] sm:rounded-xl"
            onScroll={(e) => {
              const el = e.currentTarget;
              setIndex(Math.round(el.scrollLeft / el.clientWidth));
            }}
          >
            {images.map((m, i) => (
              <button key={m.id} type="button" onClick={() => setZoomAt(i)} className="w-full shrink-0 snap-center bg-wash" aria-label={`放大第 ${i + 1} 張照片`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url!}
                  alt=""
                  width={m.width ?? undefined}
                  height={m.height ?? undefined}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding="async"
                  className="aspect-[4/3] w-full object-contain"
                />
              </button>
            ))}
          </div>
          {many && (
            <>
              <span className="absolute top-3 right-3 rounded-full bg-black/55 px-2 py-0.5 text-xs text-white tabular-nums">
                {index + 1} / {images.length}
              </span>
              <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
                {images.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-label={`第 ${i + 1} 張`}
                    onClick={() => go(i)}
                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"} shadow`}
                  />
                ))}
              </div>
              <button type="button" aria-label="上一張" onClick={() => go(Math.max(0, index - 1))} className="absolute top-1/2 left-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg shadow sm:flex">
                ‹
              </button>
              <button type="button" aria-label="下一張" onClick={() => go(Math.min(images.length - 1, index + 1))} className="absolute top-1/2 right-2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-lg shadow sm:flex">
                ›
              </button>
            </>
          )}
        </div>
      )}

      {images.length > 0 && (
        <dialog
          ref={dialog}
          onClose={() => setZoomAt(null)}
          className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 backdrop:bg-black"
        >
          <div ref={zoomStrip} className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]">
            {images.map((m) => (
              <div key={m.id} className="flex h-full w-full shrink-0 snap-center items-center justify-center" onClick={() => dialog.current?.close()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url!} alt="" decoding="async" className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
          <button type="button" autoFocus onClick={() => dialog.current?.close()} className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 flex size-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white" aria-label="關閉">
            ×
          </button>
        </dialog>
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
