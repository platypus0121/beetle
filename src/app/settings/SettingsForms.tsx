"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "@/components/Toaster";
import { createClient } from "@/lib/supabase/client";
import { compressImage, extOf } from "@/lib/image-compress";
import { CITIES, NOTIFICATION_TYPES } from "@/lib/constants";
import { mediaUrl } from "@/lib/format";
import { FormError, Submit } from "@/components/Submit";
import { Avatar } from "@/components/ui";
import { changePassword, saveNotificationSettings, saveProfile } from "./actions";

export function ProfileForm({ p }: { p: { username: string; bio: string | null; city: string | null; avatar_path: string | null; dm_friends_only: boolean } }) {
  const [state, action] = useActionState(saveProfile, null);
  useEffect(() => {
    if (state?.ok) toast("個人資料已儲存");
  }, [state]);
  const [avatar, setAvatar] = useState(p.avatar_path);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("請先登入");
      const blob = await compressImage(new File([await squareCrop(file)], "a", { type: "image/jpeg" }));
      if (blob.size > 500 * 1024) throw new Error("頭像檔案太大");
      const path = `${auth.user.id}/avatar-${crypto.randomUUID()}.${extOf(blob)}`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (error) throw new Error("上傳失敗");
      setAvatar(path);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "上傳失敗");
    }
    setBusy(false);
  }

  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="avatar_path" value={avatar ?? ""} />
      <div className="flex items-center gap-3">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(avatar, "avatars")!} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <Avatar name={p.username} size={64} />
        )}
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "上傳中…" : "更換頭像"}
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        {err && <span className="text-xs text-danger">{err}</span>}
      </div>
      <div>
        <label className="label" htmlFor="username">
          暱稱
        </label>
        <input id="username" name="username" required minLength={2} maxLength={20} defaultValue={p.username} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="bio">
          自我介紹
        </label>
        <textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={p.bio ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="city">
          所在縣市
        </label>
        <select id="city" name="city" className="input" defaultValue={p.city ?? ""}>
          <option value="">不顯示</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="dm_friends_only" defaultChecked={p.dm_friends_only} className="size-4 accent-accent" />
        只接受好友的私訊
      </label>
      <Submit>儲存</Submit>
    </form>
  );
}

// 頭像裁成正方形、縮到 512px
async function squareCrop(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = Math.min(512, side);
  c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("無法處理圖片"))), "image/jpeg", 0.9));
}

export function NotificationForm({ disabled }: { disabled: string[] }) {
  const [state, action] = useActionState(saveNotificationSettings, null);
  useEffect(() => {
    if (state?.ok) toast("通知設定已儲存");
  }, [state]);
  return (
    <form action={action} className="space-y-2">
      <FormError state={state} />
      <div className="grid gap-x-6 sm:grid-cols-2">
        {Object.entries(NOTIFICATION_TYPES).map(([k, label]) => (
          <label key={k} className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" name={`n_${k}`} defaultChecked={!disabled.includes(k)} className="size-4 accent-accent" />
            {label}
          </label>
        ))}
      </div>
      <Submit className="btn">儲存通知設定</Submit>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  useEffect(() => {
    if (state?.ok) toast("密碼已更新");
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div>
        <label className="label" htmlFor="password">
          新密碼
        </label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          再輸入一次
        </label>
        <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </div>
      <Submit>更新密碼</Submit>
    </form>
  );
}
