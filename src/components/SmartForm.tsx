"use client";
import { createContext, useContext, useEffect, useRef, useState, type FormHTMLAttributes, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type Result = { ok: boolean; error?: string; field?: string } | null | undefined;
type Snapshot = Record<string, string | string[]>;

const FieldCtx = createContext<{ field?: string; error?: string }>({});

/** 放在欄位下方：伺服器指出是這個欄位有問題時，就在這裡顯示錯誤。 */
export function FieldError({ name }: { name: string }) {
  const ctx = useContext(FieldCtx);
  if (ctx.field !== name || !ctx.error) return null;
  return (
    <p role="alert" id={`${name}-error`} className="mt-1 text-xs text-danger">
      {ctx.error}
    </p>
  );
}

// 文字類欄位才存草稿、才還原；隱藏欄位由元件自己的 state 管，檔案與密碼不存。
function fields(form: HTMLFormElement) {
  return Array.from(form.elements).filter(
    (el): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) &&
      !!el.name &&
      !["hidden", "file", "password", "submit", "button"].includes(el.type),
  );
}

function snapshot(form: HTMLFormElement): Snapshot {
  const out: Snapshot = {};
  for (const el of fields(form)) {
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      if (!el.checked) continue;
      const prev = out[el.name];
      out[el.name] = el.type === "checkbox" ? [...(Array.isArray(prev) ? prev : []), el.value] : el.value;
    } else out[el.name] = el.value;
  }
  return out;
}

// 還原時要讓受控欄位（React state）也跟著更新：
// 勾選類用 click() 觸發 onChange；文字類用原生 setter 寫值再發 input/change 事件。
function restore(form: HTMLFormElement, snap: Snapshot) {
  for (const el of fields(form)) {
    const v = snap[el.name];
    if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
      const want = Array.isArray(v) ? v.includes(el.value) : v === el.value;
      if (el.checked !== want && !(el.type === "radio" && !want)) el.click();
      continue;
    }
    if (typeof v !== "string" || el.value === v) continue;
    const proto = Object.getPrototypeOf(el) as object;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

const hasContent = (s: Snapshot) => Object.values(s).some((v) => (Array.isArray(v) ? v.length > 0 : v.trim().length > 0));

/**
 * 取代 <form>：
 * - React 19 送出後一律重設表單，失敗時使用者打的字會不見——這裡在送出前拍快照、失敗後還原。
 * - 伺服器回傳 field 時，捲到該欄位並聚焦，<FieldError> 在欄位旁顯示訊息。
 * - 給 draftKey 就把文字欄位自動存成草稿（依登入者區分），下次打開可選擇還原。
 */
export function SmartForm({
  state,
  draftKey,
  children,
  ...props
}: { state: Result; draftKey?: string; children: ReactNode } & Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
    action: (formData: FormData) => void;
  }) {
  const ref = useRef<HTMLFormElement>(null);
  const last = useRef<Snapshot | null>(null);
  const storeKey = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [offer, setOffer] = useState<Snapshot | null>(null);

  // 找出草稿的儲存鍵（含使用者 id），有內容就詢問要不要還原
  useEffect(() => {
    if (!draftKey) return;
    let cancelled = false;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (cancelled || !data.session) return;
        storeKey.current = `draft:${data.session.user.id}:${draftKey}`;
        try {
          const raw = localStorage.getItem(storeKey.current);
          const snap = raw ? (JSON.parse(raw) as Snapshot) : null;
          if (snap && hasContent(snap)) setOffer(snap);
        } catch {
          /* 無痕模式等情況讀不到就算了 */
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  const save = (snap: Snapshot | null) => {
    if (!storeKey.current) return;
    try {
      if (snap && hasContent(snap)) localStorage.setItem(storeKey.current, JSON.stringify(snap));
      else localStorage.removeItem(storeKey.current);
    } catch {
      /* 儲存空間滿了或被封鎖 */
    }
  };

  // 失敗：還原內容、標出欄位
  useEffect(() => {
    const form = ref.current;
    if (!form || !state || state.ok) return;
    if (last.current) {
      restore(form, last.current);
      save(last.current);
    }
    // 欄位外層可標 data-field（例如物種選擇器、勾選群組），優先捲到那裡
    const f = state.field ? CSS.escape(state.field) : null;
    const box = f ? form.querySelector<HTMLElement>(`[data-field="${f}"]`) : null;
    const input = box
      ? box.querySelector<HTMLElement>("input:not([type=hidden]):not(.sr-only), select, textarea")
      : f
        ? form.querySelector<HTMLElement>(`[name="${f}"]:not([type=hidden]):not(.sr-only)`)
        : null;
    const target = box ?? input;
    if (target) {
      input?.setAttribute("aria-invalid", "true");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input?.focus({ preventScroll: true }), 300);
    } else form.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);

  return (
    <FieldCtx.Provider value={state && !state.ok ? { field: state.field, error: state.error } : {}}>
      <form
        ref={ref}
        {...props}
        onSubmit={(e) => {
          props.onSubmit?.(e);
          if (e.defaultPrevented) return;
          last.current = snapshot(e.currentTarget);
          setOffer(null);
          save(null); // 送出就先清掉；失敗時上面會再存回去
        }}
        onInput={(e) => {
          props.onInput?.(e);
          (e.target as HTMLElement).removeAttribute?.("aria-invalid");
          if (!draftKey) return;
          const form = e.currentTarget;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => save(snapshot(form)), 500);
        }}
        onChange={(e) => {
          props.onChange?.(e);
          if (!draftKey) return;
          const form = e.currentTarget;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => save(snapshot(form)), 500);
        }}
      >
        {offer && (
          <div className="notice mb-4 flex flex-wrap items-center justify-between gap-2">
            <span>有上次沒寫完的內容，要還原嗎？（照片不會保存）</span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setOffer(null);
                  save(null);
                }}
              >
                捨棄
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  if (ref.current) restore(ref.current, offer);
                  setOffer(null);
                }}
              >
                還原
              </button>
            </span>
          </div>
        )}
        {children}
      </form>
    </FieldCtx.Provider>
  );
}

/** 欄位右下角的剩餘字數：靠近上限才變色。 */
export function CharCount({ htmlFor, max }: { htmlFor: string; max: number }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const el = document.getElementById(htmlFor) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    const sync = () => setN(el.value.length);
    sync();
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [htmlFor]);
  if (n === null) return null;
  const left = max - n;
  return (
    <span aria-live="polite" className={`text-xs tabular-nums ${left < max * 0.1 ? "text-warn" : "text-faint"}`}>
      {n}/{max}
    </span>
  );
}
