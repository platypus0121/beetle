"use client";
import { useActionState } from "react";
import { ImageUploader, type UploadedImage } from "@/components/ImageUploader";
import { SpeciesPicker, type SpeciesOption } from "@/components/SpeciesPicker";
import { VideoField } from "@/components/VideoField";
import { FormError, Submit } from "@/components/Submit";
import { LIMITS, POST_CATEGORIES } from "@/lib/constants";
import { savePost } from "./actions";
import { useState } from "react";

export type PostInitial = {
  id: number;
  category: string;
  title: string;
  body: string;
  youtube_id: string | null;
  species: SpeciesOption | null;
  images: UploadedImage[];
  hasVideo: boolean;
};

export function PostForm({ initial, videoEnabled, presetSpecies }: { initial?: PostInitial; videoEnabled: boolean; presetSpecies?: SpeciesOption | null }) {
  const [state, action] = useActionState(savePost, null);
  const [kept, setKept] = useState<UploadedImage[]>(initial?.images ?? []);
  const [removed, setRemoved] = useState<number[]>([]);
  return (
    <form action={action} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="kept_count" value={kept.length} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removed_media" value={id} />
      ))}
      <FormError state={state} />
      <div>
        <span className="label">分類</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(POST_CATEGORIES).map(([k, label], i) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="category" value={k} defaultChecked={initial ? initial.category === k : i === 1} className="peer sr-only" required />
              <span className="inline-flex min-h-9 items-center rounded-full border border-line px-3.5 text-sm peer-checked:border-accent peer-checked:bg-accent-wash peer-checked:text-accent">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <span className="label">物種（選填）</span>
        <SpeciesPicker initial={initial?.species ?? presetSpecies ?? null} />
        <p className="hint">綁定物種後，其他人可以從物種頁找到這篇文章</p>
      </div>
      <div>
        <label className="label" htmlFor="title">
          標題
        </label>
        <input id="title" name="title" required minLength={2} maxLength={80} defaultValue={initial?.title} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="body">
          內容
        </label>
        <textarea id="body" name="body" required maxLength={10000} rows={8} defaultValue={initial?.body} className="input" />
      </div>
      <div>
        <span className="label">照片</span>
        {kept.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {kept.map((i) => (
              <div key={i.id} className="relative aspect-square overflow-hidden rounded-lg border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="移除照片"
                  className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                  onClick={() => {
                    setKept(kept.filter((k) => k.id !== i.id));
                    setRemoved([...removed, i.id]);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <ImageUploader max={LIMITS.postImages - kept.length} />
      </div>
      {!initial?.hasVideo && (
        <div>
          <span className="label">影片（選填）</span>
          <VideoField enabled={videoEnabled} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="youtube">
          YouTube 連結（選填）
        </label>
        <input
          id="youtube"
          name="youtube"
          inputMode="url"
          placeholder="https://youtu.be/…"
          defaultValue={initial?.youtube_id ? `https://youtu.be/${initial.youtube_id}` : ""}
          className="input"
        />
      </div>
      <div className="flex gap-2">
        <Submit className="btn btn-primary flex-1">{initial ? "儲存" : "發布"}</Submit>
        <Submit className="btn" name="intent" value="draft">
          存成草稿
        </Submit>
      </div>
    </form>
  );
}
