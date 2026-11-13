"use client";
import { useState } from "react";

export type Point = { date: string; value: number };

// 單一數列的折線圖（一張圖一個量：體重、頭幅、溫度各自一張，不共用兩個 y 軸）。
// 滑鼠或手指移到圖上會顯示該點的日期與數值；完整數字另有表格。
export function LineChart({ points, unit, label, height = 180 }: { points: Point[]; unit: string; label: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length === 0) return null;
  const W = 600;
  const H = height;
  const pad = { l: 44, r: 16, t: 14, b: 26 };
  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.value);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || Math.max(1, hi * 0.1);
  const y0 = Math.max(0, lo - span * 0.15);
  const y1 = hi + span * 0.15;
  const sx = (t: number) => (x1 === x0 ? (pad.l + W - pad.r) / 2 : pad.l + ((t - x0) / (x1 - x0)) * (W - pad.l - pad.r));
  const sy = (v: number) => H - pad.b - ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${sx(xs[i]).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");
  const ticks = [y0, (y0 + y1) / 2, y1];
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
  const md = (d: string) => d.slice(5).replace("-", "/");
  const h = hover !== null ? points[hover] : null;

  function locate(clientX: number, el: SVGSVGElement) {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    xs.forEach((t, i) => {
      if (Math.abs(sx(t) - px) < Math.abs(sx(xs[best]) - px)) best = i;
    });
    setHover(best);
  }

  return (
    <figure>
      <figcaption className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {label}（{unit}）
        </span>
        <span className="text-xs text-sub" aria-live="polite">
          {h ? `${h.date.replaceAll("-", "/")}　${fmt(h.value)} ${unit}` : `最新 ${fmt(points[points.length - 1].value)} ${unit}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-pan-y select-none"
        role="img"
        aria-label={`${label}折線圖，共 ${points.length} 筆，最小 ${fmt(lo)}、最大 ${fmt(hi)} ${unit}`}
        onMouseMove={(e) => locate(e.clientX, e.currentTarget)}
        onMouseLeave={() => setHover(null)}
        onTouchStart={(e) => locate(e.touches[0].clientX, e.currentTarget)}
        onTouchMove={(e) => locate(e.touches[0].clientX, e.currentTarget)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="15" fill="var(--color-sub)">
              {fmt(t)}
            </text>
          </g>
        ))}
        <text x={sx(x0)} y={H - 6} textAnchor={points.length > 1 ? "start" : "middle"} fontSize="15" fill="var(--color-sub)">
          {md(points[0].date)}
        </text>
        {points.length > 1 && (
          <text x={sx(x1)} y={H - 6} textAnchor="end" fontSize="15" fill="var(--color-sub)">
            {md(points[points.length - 1].date)}
          </text>
        )}
        {h && <line x1={sx(xs[hover!])} x2={sx(xs[hover!])} y1={pad.t} y2={H - pad.b} stroke="var(--color-faint)" strokeWidth="1" strokeDasharray="3 3" />}
        <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={sx(xs[i])} cy={sy(p.value)} r={hover === i ? 9 : 6.5} fill="var(--color-accent)" stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
    </figure>
  );
}
