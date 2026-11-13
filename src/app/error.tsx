"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-sm py-16 text-center">
      <h1 className="text-lg font-semibold">出了點問題</h1>
      <p className="mt-1 text-sm text-sub">請再試一次。如果持續發生，請稍後再回來。</p>
      <button className="btn btn-primary mt-5" onClick={() => reset()}>
        重試
      </button>
    </div>
  );
}
